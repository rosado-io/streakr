import { describe, it, expect, vi } from "vitest";
import { GitLabProvider } from "../providers/gitlab";
import type { FetchParams } from "../types";

const baseParams: FetchParams = {
  user: "johndoe",
  start: "2025-06-01",
  end: "2025-06-03",
};

/** Build a mock fetch that returns different responses per URL substring. */
function buildFetchMock(
  responses: Array<{ match: string; body: unknown; headers?: Record<string, string> }>,
) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    const entry = responses.find((r) => url.includes(r.match));
    if (!entry) throw new Error(`Unexpected fetch URL: ${url}`);
    return new Response(JSON.stringify(entry.body), {
      status: 200,
      headers: entry.headers,
    });
  });
}

const USER_RESPONSE = [{ id: 42, username: "johndoe" }];

describe("GitLabProvider", () => {
  it("maps events to canonical daily counts", async () => {
    const fetchMock = buildFetchMock([
      { match: "/api/v4/users?username=", body: USER_RESPONSE },
      {
        match: "/api/v4/users/42/events",
        body: [
          { created_at: "2025-06-01T10:00:00.000Z" },
          { created_at: "2025-06-01T14:00:00.000Z" },
          { created_at: "2025-06-03T09:00:00.000Z" },
          { created_at: "2025-05-31T23:59:59.000Z" }, // outside range — filtered
        ],
      },
    ]);

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });
    const result = await provider.fetchEvents(baseParams);

    expect(result).toEqual([
      { date: "2025-06-01", count: 2 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 1 },
    ]);
  });

  it("sends PRIVATE-TOKEN auth header and resolves username to user ID", async () => {
    const fetchMock = buildFetchMock([
      { match: "/api/v4/users?username=", body: USER_RESPONSE },
      { match: "/api/v4/users/42/events", body: [{ created_at: "2025-06-01T10:00:00.000Z" }] },
    ]);

    const provider = new GitLabProvider({ token: "glpat_abc123", fetch: fetchMock });
    await provider.fetchEvents({ user: "johndoe", start: "2025-06-01", end: "2025-06-01" });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [userUrl, userInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(userUrl).toContain("/api/v4/users?username=johndoe");
    expect((userInit.headers as Record<string, string>)?.["PRIVATE-TOKEN"]).toBe("glpat_abc123");

    const [eventsUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(eventsUrl).toContain("/api/v4/users/42/events");
    expect(eventsUrl).toContain("after=2025-06-01");
    expect(eventsUrl).toContain("before=2025-06-01");
  });

  it("supports custom baseUrl for self-hosted GitLab", async () => {
    const fetchMock = buildFetchMock([
      { match: "/api/v4/users?username=", body: USER_RESPONSE },
      { match: "/api/v4/users/42/events", body: [] },
    ]);

    const provider = new GitLabProvider({
      token: "glpat_test",
      baseUrl: "https://gitlab.mycompany.com",
      fetch: fetchMock,
    });

    await provider.fetchEvents(baseParams);

    const [userUrl] = fetchMock.mock.calls[0] as [string];
    expect(userUrl).toContain("https://gitlab.mycompany.com/api/v4/users");
  });

  it("follows Link header pagination to collect all events", async () => {
    const _page1Url = "https://gitlab.com/api/v4/users/42/events?per_page=100";
    const page2Url = "https://gitlab.com/api/v4/users/42/events?page=2&per_page=100";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/v4/users?username=")) {
        return new Response(JSON.stringify(USER_RESPONSE), { status: 200 });
      }

      if (url === page2Url) {
        return new Response(JSON.stringify([{ created_at: "2025-06-03T08:00:00.000Z" }]), {
          status: 200,
        });
      }

      // First events page — has a next link
      return new Response(JSON.stringify([{ created_at: "2025-06-01T10:00:00.000Z" }]), {
        status: 200,
        headers: { link: `<${page2Url}>; rel="next"` },
      });
    });

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });
    const result = await provider.fetchEvents(baseParams);

    expect(result).toEqual([
      { date: "2025-06-01", count: 1 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 1 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3); // user lookup + page 1 + page 2
  });

  it("throws when GitLab user is not found", async () => {
    const fetchMock = buildFetchMock([{ match: "/api/v4/users?username=", body: [] }]);

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });
    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      'GitLab user "johndoe" not found',
    );
  });

  it("throws on non-OK HTTP response", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    });

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });
    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      "GitLab API request failed (401 Unauthorized): Unauthorized",
    );
  });

  it("validates date formats and ranges before calling fetch", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("{}", { status: 200 });
    });

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });

    await expect(
      provider.fetchEvents({ user: "johndoe", start: "2025-06-10", end: "2025-06-01" }),
    ).rejects.toThrow('Invalid range: start "2025-06-10" must be <= end "2025-06-01"');

    await expect(
      provider.fetchEvents({ user: "johndoe", start: "2025/06/01", end: "2025-06-01" }),
    ).rejects.toThrow('Invalid start date "2025/06/01" (expected YYYY-MM-DD)');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a zero-filled canonical range when API returns no events", async () => {
    const fetchMock = buildFetchMock([
      { match: "/api/v4/users?username=", body: USER_RESPONSE },
      { match: "/api/v4/users/42/events", body: [] },
    ]);

    const provider = new GitLabProvider({ token: "glpat_test", fetch: fetchMock });
    const result = await provider.fetchEvents(baseParams);

    expect(result).toEqual([
      { date: "2025-06-01", count: 0 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 0 },
    ]);
  });

  it("throws when token is empty", () => {
    expect(() => new GitLabProvider({ token: "   " })).toThrow(
      "GitLabProvider requires a non-empty token",
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { GitHubProvider } from "../providers/github";
import type { FetchParams } from "../types";

const baseParams: FetchParams = {
  user: "octocat",
  start: "2025-06-01",
  end: "2025-06-03",
};

describe("GitHubProvider", () => {
  it("maps contributionsCollection days to canonical daily counts", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              contributionsCollection: {
                contributionCalendar: {
                  weeks: [
                    {
                      contributionDays: [
                        { date: "2025-05-31", contributionCount: 7 },
                        { date: "2025-06-01", contributionCount: 2 },
                        { date: "2025-06-03", contributionCount: 5 },
                      ],
                    },
                  ],
                },
              },
            },
            rateLimit: {
              limit: 5000,
              remaining: 4999,
              resetAt: "2025-06-01T01:00:00Z",
              cost: 1,
            },
          },
        }),
        { status: 200 },
      );
    });

    const provider = new GitHubProvider({
      token: "ghp_test",
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);
    expect(result).toEqual([
      { date: "2025-06-01", count: 2 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 5 },
    ]);
  });

  it("sends PAT auth header and expected GraphQL variables", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              contributionsCollection: {
                contributionCalendar: {
                  weeks: [{ contributionDays: [{ date: "2025-06-01", contributionCount: 1 }] }],
                },
              },
            },
          },
        }),
        { status: 200 },
      );
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    await provider.fetchEvents({
      user: "octocat",
      start: "2025-06-01",
      end: "2025-06-01",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];

    expect(requestUrl).toBe("https://api.github.com/graphql");
    expect(requestInit?.headers).toEqual({
      Authorization: "Bearer ghp_token",
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "streakr",
    });

    const body = JSON.parse(String(requestInit?.body)) as {
      query: string;
      variables: Record<string, string>;
    };

    expect(body.query).toContain("contributionsCollection");
    expect(body.variables).toEqual({
      login: "octocat",
      from: "2025-06-01T00:00:00Z",
      to: "2025-06-01T23:59:59Z",
    });
  });

  it("throws on GraphQL errors and includes rate-limit context when present", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: {
            rateLimit: {
              limit: 5000,
              remaining: 0,
              resetAt: "2025-06-01T01:00:00Z",
              cost: 1,
            },
          },
          errors: [{ message: "Bad credentials" }],
        }),
        { status: 200 },
      );
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      "GitHub GraphQL error: Bad credentials (rateLimit remaining=0, resetAt=2025-06-01T01:00:00Z)",
    );
  });

  it("throws when GitHub user is missing", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: {
            user: null,
          },
        }),
        { status: 200 },
      );
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      'GitHub user "octocat" not found',
    );
  });

  it("throws on non-OK HTTP response", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("Bad credentials", {
        status: 401,
        statusText: "Unauthorized",
      });
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      "GitHub GraphQL request failed (401 Unauthorized): Bad credentials",
    );
  });

  it("validates date formats and ranges before calling fetch", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("{}", { status: 200 });
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    await expect(
      provider.fetchEvents({
        user: "octocat",
        start: "2025-06-10",
        end: "2025-06-01",
      }),
    ).rejects.toThrow('Invalid range: start "2025-06-10" must be <= end "2025-06-01"');

    await expect(
      provider.fetchEvents({
        user: "octocat",
        start: "2025/06/01",
        end: "2025-06-01",
      }),
    ).rejects.toThrow('Invalid start date "2025/06/01" (expected YYYY-MM-DD)');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a zero-filled canonical range when API returns no days", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              contributionsCollection: {
                contributionCalendar: {
                  weeks: [],
                },
              },
            },
          },
        }),
        { status: 200 },
      );
    });

    const provider = new GitHubProvider({
      token: "ghp_token",
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);
    expect(result).toEqual([
      { date: "2025-06-01", count: 0 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 0 },
    ]);
  });
});

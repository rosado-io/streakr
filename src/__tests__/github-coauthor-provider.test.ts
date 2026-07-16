import { describe, it, expect, vi } from "vitest";
import { GitHubCoAuthorProvider } from "../providers/github-coauthor";
import type { FetchParams } from "../types";

const baseParams: FetchParams = {
  user: "rosado-io",
  start: "2025-06-01",
  end: "2025-06-03",
};

const commit = (date: string) => ({ commit: { author: { date: `${date}T12:00:00Z` } } });

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 });

const parseQuery = (input: RequestInfo | URL): string =>
  new URL(String(input)).searchParams.get("q") ?? "";

const parsePage = (input: RequestInfo | URL): number =>
  Number(new URL(String(input)).searchParams.get("page") ?? "1");

const authorDateRange = (query: string): [string, string] => {
  const match = /author-date:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/.exec(query);
  return match ? [match[1], match[2]] : ["", ""];
};

describe("GitHubCoAuthorProvider", () => {
  it("buckets commits by author date with per-agent sources", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        total_count: 3,
        items: [commit("2025-06-01"), commit("2025-06-01"), commit("2025-06-03")],
      }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_test",
      agents: ["claude"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);

    expect(result).toEqual([
      { date: "2025-06-01", count: 2, sources: { claude: 2 } },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("sends auth headers and builds the commit search query", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      json({ total_count: 0, items: [] }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    await provider.fetchEvents({ user: "octocat", start: "2025-06-01", end: "2025-06-01" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];

    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe("https://api.github.com/search/commits");
    expect(url.searchParams.get("q")).toBe(
      'author:octocat "noreply@anthropic.com" author-date:2025-06-01..2025-06-01',
    );
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("page")).toBe("1");

    expect(requestInit?.headers).toEqual({
      Authorization: "Bearer ghp_token",
      Accept: "application/vnd.github+json",
      "User-Agent": "streakr",
    });
  });

  it("uses the agent name as the match when no string email exists (copilot)", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      json({ total_count: 0, items: [] }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["copilot"],
      fetch: fetchMock,
    });

    await provider.fetchEvents({ user: "octocat", start: "2025-06-01", end: "2025-06-01" });

    const query = parseQuery(fetchMock.mock.calls[0][0] as RequestInfo | URL);
    expect(query).toContain('"copilot"');
    expect(query).not.toContain('"co-authored-by:');
  });

  it("uses Codex's real co-author email as the commit search match", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      json({ total_count: 0, items: [] }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["codex"],
      fetch: fetchMock,
    });

    await provider.fetchEvents({ user: "octocat", start: "2025-06-01", end: "2025-06-01" });

    const query = parseQuery(fetchMock.mock.calls[0][0] as RequestInfo | URL);
    expect(query).toBe('author:octocat "codex@openai.com" author-date:2025-06-01..2025-06-01');
  });

  it("matches trailers whose display name sits between the label and the email", async () => {
    // Simulates GitHub commit search over `Co-Authored-By: Claude <noreply@anthropic.com>`:
    // the label glued to the email never matches (the old buggy query), only the
    // email as a standalone quoted term does.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const query = parseQuery(input);
      if (query.includes('"co-authored-by: noreply@anthropic.com"')) {
        return json({ total_count: 0, items: [] });
      }
      if (query.includes('"noreply@anthropic.com"')) {
        return json({ total_count: 1, items: [commit("2025-06-01")] });
      }
      return json({ total_count: 0, items: [] });
    });

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);

    expect(result[0]).toEqual({ date: "2025-06-01", count: 1, sources: { claude: 1 } });
  });

  it("paginates until every page in the range is collected", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const page = parsePage(input);
      return page === 1
        ? json({ total_count: 150, items: Array.from({ length: 100 }, () => commit("2025-06-01")) })
        : json({ total_count: 150, items: Array.from({ length: 50 }, () => commit("2025-06-02")) });
    });

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { date: "2025-06-01", count: 100, sources: { claude: 100 } },
      { date: "2025-06-02", count: 50, sources: { claude: 50 } },
      { date: "2025-06-03", count: 0 },
    ]);
  });

  it("splits the range adaptively when a window exceeds the 1000-result cap", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const [start, end] = authorDateRange(parseQuery(input));
      if (start === "2025-01-01" && end === "2025-12-31") {
        return json({ total_count: 1500, items: Array.from({ length: 100 }, () => commit(start)) });
      }
      if (start === "2025-01-01") {
        return json({ total_count: 1, items: [commit("2025-03-15")] });
      }
      return json({ total_count: 1, items: [commit("2025-09-20")] });
    });

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents({
      user: "rosado-io",
      start: "2025-01-01",
      end: "2025-12-31",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const populated = result.filter((day) => day.count > 0);
    expect(populated).toEqual([
      { date: "2025-03-15", count: 1, sources: { claude: 1 } },
      { date: "2025-09-20", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("queries configured agents sequentially and keys sources per agent", async () => {
    const order: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const query = parseQuery(input);
      if (query.includes("noreply@anthropic.com")) {
        order.push("claude");
        return json({ total_count: 1, items: [commit("2025-06-01")] });
      }
      order.push("codex");
      return json({ total_count: 1, items: [commit("2025-06-01")] });
    });

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude", "codex"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);

    expect(order).toEqual(["claude", "codex"]);
    expect(result[0]).toEqual({
      date: "2025-06-01",
      count: 2,
      sources: { claude: 1, codex: 1 },
    });
  });

  it("returns a zero-filled canonical range when no commits match", async () => {
    const fetchMock = vi.fn(async () => json({ total_count: 0, items: [] }));

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    const result = await provider.fetchEvents(baseParams);

    expect(result).toEqual([
      { date: "2025-06-01", count: 0 },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 0 },
    ]);
  });

  it("throws a clear error on secondary rate-limit 403s", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("You have exceeded a secondary rate limit", {
          status: 403,
          statusText: "Forbidden",
        }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      "GitHub commit search hit a secondary rate limit (403 Forbidden): You have exceeded a secondary rate limit",
    );
  });

  it("throws on non-OK HTTP responses", async () => {
    const fetchMock = vi.fn(
      async () => new Response("boom", { status: 500, statusText: "Internal Server Error" }),
    );

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    await expect(provider.fetchEvents(baseParams)).rejects.toThrow(
      "GitHub commit search request failed (500 Internal Server Error): boom",
    );
  });

  it("validates date formats and ranges before calling fetch", async () => {
    const fetchMock = vi.fn(async () => json({ total_count: 0, items: [] }));

    const provider = new GitHubCoAuthorProvider({
      token: "ghp_token",
      agents: ["claude"],
      fetch: fetchMock,
    });

    await expect(
      provider.fetchEvents({ user: "octocat", start: "2025-06-10", end: "2025-06-01" }),
    ).rejects.toThrow('Invalid range: start "2025-06-10" must be <= end "2025-06-01"');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when constructed with an unknown agent key", () => {
    expect(() => new GitHubCoAuthorProvider({ token: "ghp_token", agents: ["nope"] })).toThrow(
      'Unknown agent key "nope"',
    );
  });

  it("throws when constructed with an empty token", () => {
    expect(() => new GitHubCoAuthorProvider({ token: "  " })).toThrow(
      "GitHubCoAuthorProvider requires a non-empty PAT token",
    );
  });
});

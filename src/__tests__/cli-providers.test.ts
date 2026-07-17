import { describe, expect, it, vi } from "vitest";

import { githubCliProvider } from "../providers/github-cli";
import { githubCliCoAuthorProvider } from "../providers/github-cli-coauthor";
import { gitlabCliProvider } from "../providers/gitlab-cli";
import { runAuthenticatedCli, runLocalCli, withoutAuthEnvironment } from "../providers/local-cli";
import type { CliRunner } from "../providers/types";

const params = { user: "eros", start: "2026-01-01", end: "2026-01-03" };

describe("local CLI environment", () => {
  it("removes host tokens while preserving unrelated configuration", () => {
    expect(
      withoutAuthEnvironment({
        PATH: "/usr/bin",
        GITHUB_TOKEN: "github-secret",
        GH_TOKEN: "github-secret-2",
        GITLAB_TOKEN: "gitlab-secret",
        GITLAB_ACCESS_TOKEN: "gitlab-secret-2",
        OAUTH_TOKEN: "oauth-secret",
        CI_JOB_TOKEN: "job-secret",
      }),
    ).toEqual({ PATH: "/usr/bin" });
  });

  it("runs the local CLI and returns its stdout", async () => {
    await expect(
      runLocalCli(process.execPath, ["-e", "process.stdout.write('cli-ok')"]),
    ).resolves.toBe("cli-ok");
  });

  it("suggests installing the CLI when the executable is missing", async () => {
    const missing: CliRunner = async () => {
      const error = new Error("spawn gh ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    };

    await expect(
      runAuthenticatedCli("GitHub", "Run `gh auth login` locally.", missing, "gh", ["api"]),
    ).rejects.toThrow(/Install gh first\. Run `gh auth login` locally\./);
  });

  it("keeps the login hint without an install suggestion for other failures", async () => {
    const denied: CliRunner = async () => {
      throw new Error("HTTP 401");
    };

    await expect(
      runAuthenticatedCli("GitLab", "Run `glab auth login` locally.", denied, "glab", ["api"]),
    ).rejects.toThrow(/^GitLab CLI request failed\. Run `glab auth login` locally\./);
  });
});

describe("githubCliProvider", () => {
  it("uses the authenticated CLI session without requesting a token", async () => {
    const runner = vi.fn<CliRunner>().mockResolvedValue(
      JSON.stringify({
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                weeks: [
                  {
                    contributionDays: [
                      { date: "2026-01-01", contributionCount: 2 },
                      { date: "2026-01-03", contributionCount: 4 },
                    ],
                  },
                ],
              },
            },
          },
        },
      }),
    );
    const provider = githubCliProvider({ runner, host: "github.example.com" });

    await expect(provider.fetchEvents(params)).resolves.toEqual([
      { date: "2026-01-01", count: 2 },
      { date: "2026-01-02", count: 0 },
      { date: "2026-01-03", count: 4 },
    ]);

    expect(runner).toHaveBeenCalledOnce();
    const [executable, args] = runner.mock.calls[0] ?? [];
    expect(executable).toBe("gh");
    expect(args).toContain("--hostname");
    expect(args).toContain("github.example.com");
    expect(args).toContain("login=eros");
    expect(args?.join(" ")).not.toMatch(/token|authorization/i);
  });

  it("fails closed when the CLI response is invalid", async () => {
    const provider = githubCliProvider({ runner: async () => "not-json" });
    await expect(provider.fetchEvents(params)).rejects.toThrow(/invalid JSON/i);
  });

  it("splits multi-year calendars into supported GitHub ranges", async () => {
    const runner = vi.fn<CliRunner>().mockImplementation(async (_executable, args) => {
      const year = args.includes("from=2025-12-30T00:00:00Z") ? "2025" : "2026";
      return JSON.stringify({
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                weeks: [
                  {
                    contributionDays: [{ date: `${year}-12-31`, contributionCount: 1 }],
                  },
                ],
              },
            },
          },
        },
      });
    });
    const provider = githubCliProvider({ runner });

    await provider.fetchEvents({ user: "eros", start: "2025-12-30", end: "2026-12-31" });

    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls[0]?.[1]).toContain("to=2025-12-31T23:59:59Z");
    expect(runner.mock.calls[1]?.[1]).toContain("from=2026-01-01T00:00:00Z");
  });

  it("surfaces GraphQL errors returned by the CLI", async () => {
    const provider = githubCliProvider({
      runner: async () =>
        JSON.stringify({ errors: [{ message: "rate limited" }, { message: "try later" }] }),
    });

    await expect(provider.fetchEvents(params)).rejects.toThrow(
      /GitHub GraphQL error: rate limited; try later/,
    );
  });

  it("fails when the user does not exist", async () => {
    const provider = githubCliProvider({
      runner: async () => JSON.stringify({ data: { user: null } }),
    });

    await expect(provider.fetchEvents(params)).rejects.toThrow(/user "eros" not found/);
  });
});

describe("githubCliCoAuthorProvider", () => {
  it("searches agent commits through the authenticated CLI session", async () => {
    const runner = vi.fn<CliRunner>().mockImplementation(async (_executable, args) => {
      const query = args.find((arg) => arg.startsWith("q=")) ?? "";
      const source = query.includes("codex@openai.com") ? "codex" : "claude";
      const date = source === "codex" ? "2026-01-02" : "2026-01-01";
      return JSON.stringify({
        total_count: 1,
        items: [{ commit: { author: { date: `${date}T12:00:00Z` } } }],
      });
    });
    const provider = githubCliCoAuthorProvider({
      agents: ["claude", "codex"],
      runner,
    });

    await expect(provider.fetchEvents(params)).resolves.toEqual([
      { date: "2026-01-01", count: 1, sources: { claude: 1 } },
      { date: "2026-01-02", count: 1, sources: { codex: 1 } },
      { date: "2026-01-03", count: 0 },
    ]);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls.flatMap(([, args]) => args).join(" ")).not.toMatch(
      /token|authorization/i,
    );
  });

  it("searches every known agent by default", async () => {
    const runner = vi
      .fn<CliRunner>()
      .mockResolvedValue(JSON.stringify({ total_count: 0, items: [] }));
    const provider = githubCliCoAuthorProvider({ runner });

    await provider.fetchEvents(params);

    const queries = runner.mock.calls
      .flatMap(([, args]) => args)
      .filter((arg) => arg.startsWith("q="));
    expect(queries.length).toBeGreaterThanOrEqual(4);
    expect(queries.join(" ")).toContain("noreply@anthropic.com");
    expect(queries.join(" ")).toContain("copilot");
  });

  it("rejects unknown agent keys", () => {
    expect(() => githubCliCoAuthorProvider({ agents: ["skynet"] })).toThrow(
      /Unknown agent key "skynet"/,
    );
  });

  it("ignores search results dated outside the requested range", async () => {
    const runner = vi.fn<CliRunner>().mockResolvedValue(
      JSON.stringify({
        total_count: 2,
        items: [
          { commit: { author: { date: "2025-12-31T23:00:00Z" } } },
          { commit: { author: { date: "2026-01-02T10:00:00Z" } } },
        ],
      }),
    );
    const provider = githubCliCoAuthorProvider({ agents: ["claude"], runner });

    await expect(provider.fetchEvents(params)).resolves.toEqual([
      { date: "2026-01-01", count: 0 },
      { date: "2026-01-02", count: 1, sources: { claude: 1 } },
      { date: "2026-01-03", count: 0 },
    ]);
  });

  it("paginates search results beyond the first page", async () => {
    const runner = vi.fn<CliRunner>().mockImplementation(async (_executable, args) => {
      const page = args.find((arg) => arg.startsWith("page="));
      const date = page === "page=1" ? "2026-01-01" : "2026-01-02";
      return JSON.stringify({
        total_count: 150,
        items: [{ commit: { author: { date: `${date}T12:00:00Z` } } }],
      });
    });
    const provider = githubCliCoAuthorProvider({ agents: ["claude"], runner });

    await expect(provider.fetchEvents(params)).resolves.toEqual([
      { date: "2026-01-01", count: 1, sources: { claude: 1 } },
      { date: "2026-01-02", count: 1, sources: { claude: 1 } },
      { date: "2026-01-03", count: 0 },
    ]);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls[1]?.[1]).toContain("page=2");
  });

  it("splits ranges that exceed the commit search result cap", async () => {
    const runner = vi.fn<CliRunner>().mockImplementation(async (_executable, args) => {
      const query = args.find((arg) => arg.startsWith("q=")) ?? "";
      if (query.includes("author-date:2026-01-01..2026-01-04")) {
        return JSON.stringify({
          total_count: 1001,
          items: [{ commit: { author: { date: "2026-01-01T12:00:00Z" } } }],
        });
      }
      const date = query.includes("author-date:2026-01-01..2026-01-02")
        ? "2026-01-01"
        : "2026-01-03";
      return JSON.stringify({
        total_count: 1,
        items: [{ commit: { author: { date: `${date}T12:00:00Z` } } }],
      });
    });
    const provider = githubCliCoAuthorProvider({ agents: ["claude"], runner });

    await expect(
      provider.fetchEvents({ user: "eros", start: "2026-01-01", end: "2026-01-04" }),
    ).resolves.toEqual([
      { date: "2026-01-01", count: 1, sources: { claude: 1 } },
      { date: "2026-01-02", count: 0 },
      { date: "2026-01-03", count: 1, sources: { claude: 1 } },
      { date: "2026-01-04", count: 0 },
    ]);
    const queries = runner.mock.calls
      .flatMap(([, args]) => args)
      .filter((arg) => arg.startsWith("q="));
    expect(queries.some((query) => query.includes("2026-01-01..2026-01-02"))).toBe(true);
    expect(queries.some((query) => query.includes("2026-01-03..2026-01-04"))).toBe(true);
  });
});

describe("gitlabCliProvider", () => {
  it("uses the authenticated CLI session and paginates events", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      created_at: `2026-01-${String((index % 3) + 1).padStart(2, "0")}T12:00:00Z`,
    }));
    const runner = vi.fn<CliRunner>().mockImplementation(async (_executable, args) => {
      const endpoint = args[args.length - 1] ?? "";
      if (endpoint.startsWith("/users?")) return JSON.stringify([{ id: 42, username: "eros" }]);
      if (endpoint.endsWith("&page=1")) return JSON.stringify(firstPage);
      return JSON.stringify([{ created_at: "2026-01-03T12:00:00Z" }]);
    });
    const provider = gitlabCliProvider({ runner, host: "gitlab.example.com" });

    const days = await provider.fetchEvents(params);

    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(101);
    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner.mock.calls.every(([, args]) => args.includes("gitlab.example.com"))).toBe(true);
    expect(runner.mock.calls.flatMap(([, args]) => args).join(" ")).not.toMatch(
      /private-token|authorization/i,
    );
  });

  it("does not silently continue when the account is unavailable", async () => {
    const provider = gitlabCliProvider({ runner: async () => "[]" });
    await expect(provider.fetchEvents(params)).rejects.toThrow(/not found/i);
  });
});

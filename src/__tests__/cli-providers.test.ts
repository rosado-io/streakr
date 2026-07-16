import { describe, expect, it, vi } from "vitest";

import { GitHubCliProvider } from "../providers/github-cli";
import { GitLabCliProvider } from "../providers/gitlab-cli";
import { withoutAuthEnvironment, type CliRunner } from "../providers/local-cli";

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
});

describe("GitHubCliProvider", () => {
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
    const provider = new GitHubCliProvider({ runner, host: "github.example.com" });

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
    const provider = new GitHubCliProvider({ runner: async () => "not-json" });
    await expect(provider.fetchEvents(params)).rejects.toThrow(/invalid JSON/i);
  });
});

describe("GitLabCliProvider", () => {
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
    const provider = new GitLabCliProvider({ runner, host: "gitlab.example.com" });

    const days = await provider.fetchEvents(params);

    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(101);
    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner.mock.calls.every(([, args]) => args.includes("gitlab.example.com"))).toBe(true);
    expect(runner.mock.calls.flatMap(([, args]) => args).join(" ")).not.toMatch(
      /private-token|authorization/i,
    );
  });

  it("does not silently continue when the account is unavailable", async () => {
    const provider = new GitLabCliProvider({ runner: async () => "[]" });
    await expect(provider.fetchEvents(params)).rejects.toThrow(/not found/i);
  });
});

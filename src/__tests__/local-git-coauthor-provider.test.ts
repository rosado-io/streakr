import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LocalGitCoAuthorProvider } from "../providers/local-git-coauthor";
import type { FetchParams } from "../types";

const CLAUDE = "Co-authored-by: Claude <noreply@anthropic.com>";
const CODEX = "Co-authored-by: Codex <noreply@openai.com>";
const HUMAN = "Co-authored-by: Jane Doe <jane@example.com>";

const git = (cwd: string, args: string[], date?: string): string =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Owner",
      GIT_AUTHOR_EMAIL: "owner@example.com",
      GIT_COMMITTER_NAME: "Owner",
      GIT_COMMITTER_EMAIL: "owner@example.com",
      ...(date
        ? { GIT_AUTHOR_DATE: `${date}T12:00:00`, GIT_COMMITTER_DATE: `${date}T12:00:00` }
        : {}),
    },
  });

const initRepo = (dir: string): void => {
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q", "-b", "main"]);
};

let commitSeq = 0;

const commit = (dir: string, date: string, trailers: string[]): void => {
  const file = `f${commitSeq++}.txt`;
  writeFileSync(join(dir, file), `${file}\n`);
  git(dir, ["add", file]);
  const message = ["chore: work", "", ...trailers].join("\n");
  git(dir, ["commit", "-q", "-m", message], date);
};

const params = (start: string, end: string): FetchParams => ({
  user: "ignored",
  start,
  end,
});

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "streakr-localgit-"));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("LocalGitCoAuthorProvider", () => {
  it("buckets agent co-authored commits by author date with per-agent sources", async () => {
    const repo = join(root, "basic");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    commit(repo, "2025-06-01", [CODEX]);
    commit(repo, "2025-06-02", [HUMAN]);
    commit(repo, "2025-06-03", [CLAUDE, CODEX]);

    const provider = new LocalGitCoAuthorProvider({ repos: [repo] });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-03"));

    expect(result).toEqual([
      { date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 1, sources: { claude: 1, codex: 1 } },
    ]);
  });

  it("ignores params.user and filters commits outside the range", async () => {
    const repo = join(root, "range");
    initRepo(repo);
    commit(repo, "2025-05-30", [CLAUDE]);
    commit(repo, "2025-06-02", [CLAUDE]);
    commit(repo, "2025-06-10", [CLAUDE]);

    const provider = new LocalGitCoAuthorProvider({ repos: [repo] });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-03"));

    expect(result).toEqual([
      { date: "2025-06-01", count: 0 },
      { date: "2025-06-02", count: 1, sources: { claude: 1 } },
      { date: "2025-06-03", count: 0 },
    ]);
  });

  it("deduplicates by commit SHA across clones and linked worktrees", async () => {
    const repo = join(root, "origin");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    commit(repo, "2025-06-01", [CODEX]);

    const clone = join(root, "clone");
    git(root, ["clone", "-q", repo, clone]);

    const worktree = join(root, "wt");
    git(repo, ["worktree", "add", "-q", "-b", "feature", worktree]);

    const provider = new LocalGitCoAuthorProvider({ repos: [repo, clone, worktree] });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } }]);
  });

  it("discovers repositories under roots and prunes node_modules", async () => {
    const base = join(root, "discovery");
    const repoA = join(base, "projects", "a");
    const repoB = join(base, "projects", "nested", "b");
    const decoy = join(base, "projects", "node_modules", "pkg");
    initRepo(repoA);
    initRepo(repoB);
    initRepo(decoy);
    commit(repoA, "2025-06-01", [CLAUDE]);
    commit(repoB, "2025-06-01", [CODEX]);
    commit(decoy, "2025-06-01", [CLAUDE]);

    const provider = new LocalGitCoAuthorProvider({ roots: [base] });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } }]);
  });

  it("skips repos that fail without aborting the whole run", async () => {
    const good = join(root, "good");
    initRepo(good);
    commit(good, "2025-06-01", [CLAUDE]);

    const missing = join(root, "does-not-exist");

    const provider = new LocalGitCoAuthorProvider({ repos: [missing, good] });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 1, sources: { claude: 1 } }]);
  });

  it("throws a clear error when git is not on the PATH", async () => {
    const repo = join(root, "nogit");
    initRepo(repo);

    const provider = new LocalGitCoAuthorProvider({
      repos: [repo],
      git: "streakr-nonexistent-git-binary",
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).rejects.toThrow(
      /git executable "streakr-nonexistent-git-binary" was not found/,
    );
  });

  it("requires at least one of repos or roots", () => {
    expect(() => new LocalGitCoAuthorProvider({})).toThrow(/requires at least one/);
  });

  it("validates the date range", async () => {
    const repo = join(root, "validate");
    initRepo(repo);
    const provider = new LocalGitCoAuthorProvider({ repos: [repo] });
    await expect(provider.fetchEvents(params("2025-06-10", "2025-06-01"))).rejects.toThrow(
      /Invalid range/,
    );
  });
});

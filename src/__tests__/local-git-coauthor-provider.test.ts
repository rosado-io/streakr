import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { localGitCoAuthorProvider } from "../providers/local-git-coauthor";
import type { FetchParams } from "../types";

const CLAUDE = "Co-authored-by: Claude <noreply@anthropic.com>";
const CODEX = "Co-authored-by: Codex <codex@openai.com>";
const HUMAN = "Co-authored-by: Jane Doe <jane@example.com>";
const OWNER = { name: "Owner", email: "owner@example.com" };
const COLLEAGUE = { name: "Colleague", email: "colleague@example.com" };
const CLAUDE_AUTHOR = { name: "Claude", email: "noreply@anthropic.com" };
const OWNER_IDENTITIES = [{ email: OWNER.email }] as const;

const git = (
  cwd: string,
  args: string[],
  date?: string,
  identity: { name: string; email: string } = OWNER,
): string =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: identity.name,
      GIT_AUTHOR_EMAIL: identity.email,
      GIT_COMMITTER_NAME: identity.name,
      GIT_COMMITTER_EMAIL: identity.email,
      ...(date
        ? { GIT_AUTHOR_DATE: `${date}T12:00:00`, GIT_COMMITTER_DATE: `${date}T12:00:00` }
        : {}),
    },
  });

const initRepo = (dir: string): void => {
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.name", OWNER.name]);
  git(dir, ["config", "user.email", OWNER.email]);
};

let commitSeq = 0;

const commit = (
  dir: string,
  date: string,
  trailers: string[],
  identity: { name: string; email: string } = OWNER,
): void => {
  const file = `f${commitSeq++}.txt`;
  writeFileSync(join(dir, file), `${file}\n`);
  git(dir, ["add", file]);
  const message = ["chore: work", "", ...trailers].join("\n");
  git(dir, ["commit", "-q", "-m", message], date, identity);
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

describe("localGitCoAuthorProvider", () => {
  it("buckets agent co-authored commits by author date with per-agent sources", async () => {
    const repo = join(root, "basic");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    commit(repo, "2025-06-01", [CODEX]);
    commit(repo, "2025-06-02", [HUMAN]);
    commit(repo, "2025-06-03", [CLAUDE, CODEX]);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-03"));

    expect(result).toEqual([
      { date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } },
      { date: "2025-06-02", count: 0 },
      { date: "2025-06-03", count: 1, sources: { claude: 1, codex: 1 } },
    ]);
  });

  it("uses configured identities and filters commits outside the range", async () => {
    const repo = join(root, "range");
    initRepo(repo);
    commit(repo, "2025-05-30", [CLAUDE]);
    commit(repo, "2025-06-02", [CLAUDE]);
    commit(repo, "2025-06-10", [CLAUDE]);

    commit(repo, "2025-06-02", [CODEX], COLLEAGUE);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-03"));

    expect(result).toEqual([
      { date: "2025-06-01", count: 0 },
      { date: "2025-06-02", count: 1, sources: { claude: 1 } },
      { date: "2025-06-03", count: 0 },
    ]);
  });

  it("counts an agent-authored commit when the user is a co-author", async () => {
    const repo = join(root, "agent-author");
    initRepo(repo);
    commit(repo, "2025-06-01", ["Co-authored-by: Owner <owner@example.com>"], CLAUDE_AUTHOR);
    commit(repo, "2025-06-01", [], CLAUDE_AUTHOR);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 1, sources: { claude: 1 } }]);
  });

  it("defaults to the published default branch and can opt into all local refs", async () => {
    const repo = join(root, "scope");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    git(repo, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    git(repo, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
    git(repo, ["switch", "-q", "-c", "feature"]);
    commit(repo, "2025-06-01", [CODEX]);

    const published = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
    });
    const local = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });

    await expect(published.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
    await expect(local.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } },
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

    const provider = localGitCoAuthorProvider({
      repos: [repo, clone, worktree],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
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

    const provider = localGitCoAuthorProvider({
      roots: [base],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 2, sources: { claude: 1, codex: 1 } }]);
  });

  it("skips repos that fail without aborting the whole run", async () => {
    const good = join(root, "good");
    initRepo(good);
    commit(good, "2025-06-01", [CLAUDE]);

    const missing = join(root, "does-not-exist");

    const provider = localGitCoAuthorProvider({
      repos: [missing, good],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    const result = await provider.fetchEvents(params("2025-06-01", "2025-06-01"));

    expect(result).toEqual([{ date: "2025-06-01", count: 1, sources: { claude: 1 } }]);
  });

  it("fails closed in strict mode instead of returning partial counts", async () => {
    const good = join(root, "strict-good");
    initRepo(good);
    commit(good, "2025-06-01", [CLAUDE]);

    const provider = localGitCoAuthorProvider({
      repos: [good, join(root, "strict-missing")],
      identities: OWNER_IDENTITIES,
      refScope: "all",
      strict: true,
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).rejects.toThrow(
      /could not scan repository/i,
    );
  });

  it("throws a clear error when git is not on the PATH", async () => {
    const repo = join(root, "nogit");
    initRepo(repo);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      git: "streakr-nonexistent-git-binary",
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).rejects.toThrow(
      /git executable "streakr-nonexistent-git-binary" was not found/,
    );
  });

  it("requires at least one of repos or roots", () => {
    expect(() => localGitCoAuthorProvider({ identities: OWNER_IDENTITIES })).toThrow(
      /requires at least one/,
    );
  });

  it("uses the configured repository identity when identities are omitted", async () => {
    const repo = join(root, "configured-identity");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);

    const provider = localGitCoAuthorProvider({ repos: [repo], refScope: "all" });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("counts published commits when refScope is remote", async () => {
    const repo = join(root, "remote-scope");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    git(repo, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    git(repo, ["switch", "-q", "-c", "feature"]);
    commit(repo, "2025-06-01", [CODEX]);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "remote",
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("falls back to conventional default branches when the remote HEAD is unknown", async () => {
    const repo = join(root, "conventional-default");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    git(repo, ["remote", "add", "origin", repo]);
    git(repo, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    git(repo, ["switch", "-q", "-c", "feature"]);
    commit(repo, "2025-06-01", [CODEX]);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("returns empty counts when no published refs can be resolved", async () => {
    const repo = join(root, "no-remote");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 0 },
    ]);
  });

  it("ignores roots that cannot be read", async () => {
    const repo = join(root, "readable");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      roots: [join(root, "missing-root")],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("matches identities defined with global regular expressions", async () => {
    const repo = join(root, "regex-identity");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    commit(repo, "2025-06-01", [CLAUDE], COLLEAGUE);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: [{ email: /owner@example\.com/g }],
      refScope: "all",
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
      { date: "2025-06-01", count: 1, sources: { claude: 1 } },
    ]);
  });

  it("counts nothing when no identity is configured or discoverable", async () => {
    const repo = join(root, "anonymous");
    initRepo(repo);
    commit(repo, "2025-06-01", [CLAUDE]);
    git(repo, ["config", "--unset", "user.name"]);
    git(repo, ["config", "--unset", "user.email"]);

    const provider = localGitCoAuthorProvider({ repos: [repo], refScope: "all" });

    const savedGlobal = process.env.GIT_CONFIG_GLOBAL;
    const savedSystem = process.env.GIT_CONFIG_SYSTEM;
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_SYSTEM = "/dev/null";
    try {
      await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).resolves.toEqual([
        { date: "2025-06-01", count: 0 },
      ]);
    } finally {
      if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
      else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
      if (savedSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM;
      else process.env.GIT_CONFIG_SYSTEM = savedSystem;
    }
  });

  it("propagates unexpected failures from the git executable", async () => {
    const repo = join(root, "broken-git");
    initRepo(repo);
    const brokenGit = join(root, "not-executable-git");
    writeFileSync(brokenGit, "#!/bin/sh\n");
    chmodSync(brokenGit, 0o644);

    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      git: brokenGit,
    });

    await expect(provider.fetchEvents(params("2025-06-01", "2025-06-01"))).rejects.toThrow(
      /EACCES|not found/,
    );
  });

  it("validates the date range", async () => {
    const repo = join(root, "validate");
    initRepo(repo);
    const provider = localGitCoAuthorProvider({
      repos: [repo],
      identities: OWNER_IDENTITIES,
      refScope: "all",
    });
    await expect(provider.fetchEvents(params("2025-06-10", "2025-06-01"))).rejects.toThrow(
      /Invalid range/,
    );
  });
});

import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";
import type { AgentTrailerRule, CoAuthor } from "./trailers";
import { AGENT_TRAILER_RULES, matchAgent } from "./trailers";
import { validateInputDates, toCanonicalDays } from "./validation";

const execFileAsync = promisify(execFile);

const UNIT = "\x1f";
const RECORD = "\x1e";
const DEFAULT_MAX_DEPTH = 6;
const MAX_BUFFER = 64 * 1024 * 1024;

const PRETTY = `format:%H${UNIT}%as${UNIT}%(trailers:key=Co-authored-by,valueonly,separator=${RECORD})`;

const LOG_ARGS = [
  "log",
  "--all",
  "--no-merges",
  "-i",
  "--grep=co-authored-by",
  "-z",
  `--pretty=${PRETTY}`,
];

export interface LocalGitCoAuthorProviderOptions {
  repos?: string[];
  roots?: string[];
  maxDepth?: number;
  rules?: readonly AgentTrailerRule[];
  git?: string;
}

interface CommitInfo {
  date: string;
  keys: Set<string>;
}

const CO_AUTHOR_RE = /^(.*?)<([^<>]+)>\s*$/;

const parseCoAuthorValue = (value: string): CoAuthor | null => {
  const match = CO_AUTHOR_RE.exec(value.trim());
  return match ? { name: match[1].trim(), email: match[2].trim() } : null;
};

const isENOENT = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";

export class LocalGitCoAuthorProvider implements Provider {
  public readonly name = "local-git";

  private readonly repos: string[];
  private readonly roots: string[];
  private readonly maxDepth: number;
  private readonly rules: readonly AgentTrailerRule[];
  private readonly git: string;

  public constructor(options: LocalGitCoAuthorProviderOptions) {
    this.repos = options.repos ?? [];
    this.roots = options.roots ?? [];
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.rules = options.rules ?? AGENT_TRAILER_RULES;
    this.git = options.git ?? "git";

    if (this.repos.length === 0 && this.roots.length === 0) {
      throw new Error("LocalGitCoAuthorProvider requires at least one of `repos` or `roots`");
    }
  }

  // `params.user` is ignored: the "user" here is the owner of the local repositories,
  // not a remote account. Only the date range is honoured.
  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);

    await this.ensureGit();

    const repos = this.resolveRepos();
    const commits = new Map<string, CommitInfo>();

    for (const repo of repos) {
      try {
        this.collectRepo(await this.readRepo(repo), commits);
      } catch {
        continue;
      }
    }

    return toCanonicalDays(this.toDays(commits, params.start, params.end), params.start, params.end);
  }

  private async ensureGit(): Promise<void> {
    try {
      await execFileAsync(this.git, ["--version"], { maxBuffer: MAX_BUFFER });
    } catch (error) {
      if (isENOENT(error)) {
        throw new Error(
          `LocalGitCoAuthorProvider: git executable "${this.git}" was not found in PATH`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  private resolveRepos(): string[] {
    const discovered = this.roots.flatMap((root) => discoverRepos(root, this.maxDepth));
    return Array.from(new Set([...this.repos, ...discovered]));
  }

  private async readRepo(cwd: string): Promise<string> {
    const { stdout } = await execFileAsync(this.git, LOG_ARGS, { cwd, maxBuffer: MAX_BUFFER });
    return stdout;
  }

  private collectRepo(stdout: string, commits: Map<string, CommitInfo>): void {
    for (const record of stdout.split("\0")) {
      if (record.length === 0) continue;
      const [sha, date, blob = ""] = record.split(UNIT);
      if (!sha || !date || commits.has(sha)) continue;

      const keys = new Set<string>();
      for (const value of blob.split(RECORD)) {
        const coAuthor = value.trim().length === 0 ? null : parseCoAuthorValue(value);
        const key = coAuthor && matchAgent(coAuthor, this.rules);
        if (key) keys.add(key);
      }

      commits.set(sha, { date, keys });
    }
  }

  private toDays(commits: Map<string, CommitInfo>, start: string, end: string): ContributionDay[] {
    const buckets = new Map<string, { count: number; sources: Record<string, number> }>();

    for (const { date, keys } of commits.values()) {
      if (keys.size === 0 || date < start || date > end) continue;
      const bucket = buckets.get(date) ?? { count: 0, sources: {} };
      bucket.count += 1;
      for (const key of keys) bucket.sources[key] = (bucket.sources[key] ?? 0) + 1;
      buckets.set(date, bucket);
    }

    return Array.from(buckets.entries()).map(([date, { count, sources }]) => ({
      date,
      count,
      sources,
    }));
  }
}

const discoverRepos = (root: string, maxDepth: number): string[] => {
  const found: string[] = [];

  const walk = (dir: string, depth: number): void => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    if (entries.some((entry) => entry.name === ".git")) {
      found.push(dir);
      return;
    }

    if (depth >= maxDepth) return;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".git") continue;
      walk(join(dir, entry.name), depth + 1);
    }
  };

  walk(root, 0);
  return found;
};

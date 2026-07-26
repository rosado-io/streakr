import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import type { ContributionDay, FetchParams } from "../types";
import { validateDateRange } from "../core/date";
import { toCanonicalDays } from "../core/normalize";
import type { Provider } from "./types";
import type { AgentTrailerRule, CoAuthor } from "./trailers";
import { AGENT_TRAILER_RULES, matchAgent, parseCoAuthorValue, testStateless } from "./trailers";
import { MAX_BUFFER } from "./local-cli";

const execFileAsync = promisify(execFile);

const UNIT = "\x1f";
const RECORD = "\x1e";
const DEFAULT_MAX_DEPTH = 6;

const PRETTY = `format:%H${UNIT}%as${UNIT}%an${UNIT}%ae${UNIT}%(trailers:key=Co-authored-by,valueonly,separator=${RECORD})`;

const LOG_ARGS = ["log", "--no-merges", "-i", "--grep=co-authored-by", "-z", `--pretty=${PRETTY}`];

export interface GitAuthorIdentity {
  name?: string | RegExp;
  email?: string | RegExp;
}

export type LocalGitRefScope = "default" | "remote" | "all";

export interface LocalGitCoAuthorProviderOptions {
  repos?: string[];
  roots?: string[];
  identities?: readonly GitAuthorIdentity[];
  refScope?: LocalGitRefScope;
  strict?: boolean;
  maxDepth?: number;
  rules?: readonly AgentTrailerRule[];
  git?: string;
  name?: string;
}

interface ResolvedLocalGitConfig {
  repos: string[];
  roots: string[];
  identities: readonly GitAuthorIdentity[];
  refScope: LocalGitRefScope;
  strict: boolean;
  maxDepth: number;
  rules: readonly AgentTrailerRule[];
  git: string;
}

interface CommitInfo {
  date: string;
  keys: Set<string>;
}

const isENOENT = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";

export const localGitCoAuthorProvider = (options: LocalGitCoAuthorProviderOptions): Provider => {
  const config: ResolvedLocalGitConfig = {
    repos: options.repos ?? [],
    roots: options.roots ?? [],
    identities: options.identities?.filter(hasIdentityMatcher) ?? [],
    refScope: options.refScope ?? "default",
    strict: options.strict ?? false,
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    rules: options.rules ?? AGENT_TRAILER_RULES,
    git: options.git ?? "git",
  };

  if (config.repos.length === 0 && config.roots.length === 0) {
    throw new Error("localGitCoAuthorProvider requires at least one of `repos` or `roots`");
  }

  return {
    name: options.name ?? "local-git",
    fetchEvents: (params) => fetchEvents(config, params),
  };
};

const fetchEvents = async (
  config: ResolvedLocalGitConfig,
  params: FetchParams,
): Promise<ContributionDay[]> => {
  validateDateRange(params.start, params.end);

  await ensureGit(config);

  const repos = resolveRepos(config);
  const commits = new Map<string, CommitInfo>();

  for (const repo of repos) {
    try {
      const identities =
        config.identities.length > 0
          ? config.identities
          : await readConfiguredIdentity(config, repo);
      collectRepo(config, await readRepo(config, repo), commits, identities);
    } catch (error) {
      if (config.strict) {
        throw new Error(`localGitCoAuthorProvider could not scan repository: ${repo}`, {
          cause: error,
        });
      }
      continue;
    }
  }

  return toCanonicalDays(toDays(commits, params.start, params.end), params.start, params.end);
};

const ensureGit = async (config: ResolvedLocalGitConfig): Promise<void> => {
  try {
    await execFileAsync(config.git, ["--version"], { maxBuffer: MAX_BUFFER });
  } catch (error) {
    if (isENOENT(error)) {
      throw new Error(
        `localGitCoAuthorProvider: git executable "${config.git}" was not found in PATH`,
        { cause: error },
      );
    }
    throw error;
  }
};

const resolveRepos = (config: ResolvedLocalGitConfig): string[] => {
  const discovered = config.roots.flatMap((root) => discoverRepos(root, config.maxDepth));
  return Array.from(new Set([...config.repos, ...discovered]));
};

const readRepo = async (config: ResolvedLocalGitConfig, cwd: string): Promise<string> => {
  const refs = await resolveLogRefs(config, cwd);
  if (refs.length === 0) return "";
  const { stdout } = await execFileAsync(config.git, [...LOG_ARGS, ...refs], {
    cwd,
    maxBuffer: MAX_BUFFER,
  });
  return stdout;
};

const readConfiguredIdentity = async (
  config: ResolvedLocalGitConfig,
  cwd: string,
): Promise<readonly GitAuthorIdentity[]> => {
  const read = async (key: "user.name" | "user.email"): Promise<string | undefined> => {
    try {
      const { stdout } = await execFileAsync(config.git, ["config", "--get", key], {
        cwd,
        maxBuffer: MAX_BUFFER,
      });
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  };
  const [name, email] = await Promise.all([read("user.name"), read("user.email")]);
  return name || email ? [{ ...(name ? { name } : {}), ...(email ? { email } : {}) }] : [];
};

const resolveLogRefs = async (config: ResolvedLocalGitConfig, cwd: string): Promise<string[]> => {
  if (config.refScope === "all") return ["--all"];
  if (config.refScope === "remote") return ["--remotes"];

  const { stdout } = await execFileAsync(
    config.git,
    ["for-each-ref", "--format=%(symref:short)", "refs/remotes/*/HEAD"],
    { cwd, maxBuffer: MAX_BUFFER },
  );
  const symbolicDefaults = stdout
    .split(/\r?\n/)
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
  if (symbolicDefaults.length > 0) return symbolicDefaults;

  const remotes = await listRemotes(config, cwd);
  const conventionalDefaults = (
    await Promise.all(
      remotes.flatMap((remote) =>
        ["main", "master"].map(async (branch) => {
          const ref = `refs/remotes/${remote}/${branch}`;
          try {
            await execFileAsync(config.git, ["rev-parse", "--verify", "--quiet", ref], {
              cwd,
              maxBuffer: MAX_BUFFER,
            });
            return ref;
          } catch {
            return null;
          }
        }),
      ),
    )
  ).filter((ref): ref is string => ref !== null);

  return conventionalDefaults;
};

const listRemotes = async (config: ResolvedLocalGitConfig, cwd: string): Promise<string[]> => {
  const { stdout } = await execFileAsync(config.git, ["remote"], { cwd, maxBuffer: MAX_BUFFER });
  return stdout
    .split(/\r?\n/)
    .map((remote) => remote.trim())
    .filter((remote) => remote.length > 0);
};

const collectRepo = (
  config: ResolvedLocalGitConfig,
  stdout: string,
  commits: Map<string, CommitInfo>,
  identities: readonly GitAuthorIdentity[],
): void => {
  for (const record of stdout.split("\0")) {
    if (record.length === 0) continue;
    const [sha, date, authorName, authorEmail, blob = ""] = record.split(UNIT);
    if (!sha || !date || commits.has(sha)) continue;

    const author = { name: authorName ?? "", email: authorEmail ?? "" };
    const coAuthors = blob
      .split(RECORD)
      .map((value) => (value.trim().length === 0 ? null : parseCoAuthorValue(value)))
      .filter((coAuthor): coAuthor is CoAuthor => coAuthor !== null);
    const belongsToUser = [author, ...coAuthors].some((person) =>
      matchesAnyIdentity(person, identities),
    );
    if (!belongsToUser) continue;

    const keys = new Set<string>();
    for (const person of [author, ...coAuthors]) {
      const key = matchAgent(person, config.rules);
      if (key) keys.add(key);
    }

    commits.set(sha, { date, keys });
  }
};

const toDays = (
  commits: Map<string, CommitInfo>,
  start: string,
  end: string,
): ContributionDay[] => {
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
};

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

const hasIdentityMatcher = (identity: GitAuthorIdentity): boolean =>
  [identity.name, identity.email].some((value) =>
    typeof value === "string" ? value.trim().length > 0 : value instanceof RegExp,
  );

const matchesIdentityField = (value: string, expected: string | RegExp | undefined): boolean => {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return testStateless(expected, value);
  return value.toLowerCase() === expected.trim().toLowerCase();
};

const matchesAnyIdentity = (person: CoAuthor, identities: readonly GitAuthorIdentity[]): boolean =>
  identities.some(
    (identity) =>
      hasIdentityMatcher(identity) &&
      matchesIdentityField(person.name, identity.name) &&
      matchesIdentityField(person.email, identity.email),
  );

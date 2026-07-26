# Agent Records

Coding-agent contribution records come from **Git co-author trailers**. When an
agent helps write a commit, it adds a `Co-authored-by:` line to the commit
message. Streakr ships two providers that count those trailers and return the
shared `ContributionDay[]` shape, keyed per agent in `sources`:

```ts
type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  sources?: Record<string, number>;
};
```

- `githubCoAuthorProvider` (main entry) queries the GitHub commit search API.
- `localGitCoAuthorProvider` (`@rosado-io/streakr/agents`, Node-only) scans local
  clones with `git log`.
- `githubCliProvider`, `githubCliCoAuthorProvider`, and `gitlabCliProvider` reuse
  authenticated local CLI sessions without accepting or exposing tokens.

They compose with `aggregate()` and `normalizeEventsToDaily()` exactly like the
[Git host providers](./providers.md).

## What the counts mean

Co-author trailers measure **commits shipped with an agent**, not agent usage:

- Sessions that don't end in a commit never appear. Planning, exploration, and
  abandoned branches leave no trace.
- One commit is one unit regardless of how much the agent contributed to it.
- Users can turn trailers off. Claude Code, for example, exposes
  `includeCoAuthoredBy` — set it to `false` and the trailer is never written.

So a count is a **lower bound** on real agent involvement. Treat it as "at least
this many commits carried an agent trailer," never as a usage total.

## Coverage

The registry `AGENT_TRAILER_RULES` (in `src/providers/trailers.ts`) matches a
co-author to an agent key by email and/or name. A trailer is
`Co-authored-by: <name> <<email>>`. These are the four built-in rules with real
samples:

| Agent       | Key        | Matched by                                                         | Sample trailer                                                         |
| ----------- | ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Claude Code | `claude`   | email `noreply@anthropic.com`                                      | `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>`            |
| Codex       | `codex`    | email `codex@openai.com`                                           | `Co-authored-by: Codex <codex@openai.com>`                             |
| opencode    | `opencode` | email `noreply@opencode.ai`                                        | `Co-authored-by: opencode (glm-5.2) <noreply@opencode.ai>`             |
| Copilot     | `copilot`  | name contains `copilot` + email ending `@users.noreply.github.com` | `Co-authored-by: Copilot <198982749+Copilot@users.noreply.github.com>` |

Notes on the samples:

- **Claude Code** carries the model in the `name`, e.g. `Claude Sonnet 4.6` or
  `Claude Opus 4.7 (1M context)`. The rule matches on email only, so every model
  variant maps to the `claude` key.
- **opencode** puts the model in parentheses in the `name`, e.g.
  `opencode (glm-5.2)`. The rule matches on email only.
- **Copilot** commits use a per-account GitHub `noreply` bot address, so the
  rule matches the name (`copilot`) together with the
  `@users.noreply.github.com` suffix.

Pass your own `rules` (a `readonly AgentTrailerRule[]`) to either provider to
extend or replace the registry. Each rule is `{ key, email?, name? }`, where
`email` and `name` accept a string (case-insensitive; `name` matches as a
substring) or a `RegExp`.

## Two routes: GitHub search vs local scan

The two providers answer the same question from different vantage points.

|                  | `githubCoAuthorProvider`                      | `localGitCoAuthorProvider`                                      |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Source           | GitHub commit search API                      | `git log` over local clones                                     |
| Scope            | Default branch only                           | Published default branches by default; configurable             |
| Hosts            | GitHub public repos (private with `repo` PAT) | Anything cloned locally — GitLab, self-hosted, unpushed         |
| Auth             | GitHub PAT                                    | None (runs where the repos live)                                |
| Publication step | None — safe to call server-side on demand     | Required — output is meant to be published as a static snapshot |
| Indexing lag     | Yes (search index)                            | No                                                              |

### Why the numbers differ

The local scan can cover GitLab, self-hosted repositories, and freshly pushed
commits that GitHub search has not indexed yet. Setting `refScope: "all"` also
includes unpublished local branches, so it intentionally produces a different
metric from public contribution calendars.

Rule of thumb: use the API route for a zero-infrastructure server-side fetch of
public GitHub work; use the local route when you want the full, cross-host
picture and can publish a snapshot.

## `githubCoAuthorProvider`

Counts commits co-authored by agents through the GitHub commit search API. For
each agent it runs a query shaped like
`author:<user> "co-authored-by: <match>" author-date:<start>..<end>` and buckets
the results by day, keyed per agent in `sources`.

```ts
import { githubCoAuthorProvider } from "@rosado-io/streakr";

const agents = githubCoAuthorProvider({
  token: process.env.GITHUB_TOKEN!,
});

const days = await agents.fetchEvents({
  user: "octocat",
  start: "2026-01-01",
  end: "2026-12-31",
});
```

### Options

```ts
githubCoAuthorProvider({
  token: "ghp_...",
  agents: ["claude", "codex", "opencode", "copilot"],
  endpoint: "https://api.github.com/search/commits",
  fetch: customFetch,
  name: "github-agents",
});
```

- `token` is required.
- `agents` is optional and defaults to every key in the registry (`claude`,
  `codex`, `opencode`, `copilot`).
- `endpoint` is optional and defaults to
  `https://api.github.com/search/commits`.
- `fetch` is optional and defaults to global `fetch`.
- `name` is optional and defaults to `"github-agents"`. Override it when
  aggregating two instances of the same source, e.g. github.com plus a GitHub
  Enterprise host.

`user`, `start`, and `end` come from the `fetchEvents` params.

### Caveats

- **Default branch only.** The commit search API does not index other branches.
- **Forks are skipped** by the search API.
- **Indexing lag.** Freshly pushed commits may not be searchable immediately.
- **Copilot undercount.** Commits authored by the Copilot bot itself are not
  matched by `author:<user>`.
- **Private repos** require a PAT with `repo` scope.
- **Run server-side.** Keep the PAT out of browser bundles.

## `localGitCoAuthorProvider`

Scans local repositories with `git log`, verifies that the author or a co-author
matches one of the configured owner identities, parses agent trailers, dedupes
by commit SHA, and buckets by day. It uses published default branches by default
and can opt into every remote or local ref.

This provider lives in the Node-only subpath. The `./agents` export is declared
behind a `node` export condition, so bundling it for a browser target fails
loudly at resolve time instead of shipping Node built-ins to the client:

```ts
import { localGitCoAuthorProvider } from "@rosado-io/streakr/agents";

const local = localGitCoAuthorProvider({
  roots: ["/Users/me/code"],
  identities: [
    { email: "me@example.com" },
    { email: /@users\.noreply\.github\.com$/i, name: "My GitHub Name" },
  ],
});

const days = await local.fetchEvents({
  start: "2026-01-01",
  end: "2026-12-31",
  user: "ignored",
});
```

### Options

```ts
localGitCoAuthorProvider({
  repos: ["/Users/me/code/streakr"],
  roots: ["/Users/me/code"],
  identities: [{ email: "me@example.com" }],
  refScope: "default",
  strict: true,
  maxDepth: 6,
  rules: AGENT_TRAILER_RULES,
  git: "git",
  name: "local-git",
});
```

- `repos` is an explicit list of repository paths to scan.
- `roots` are directories to walk (up to `maxDepth`) looking for repos.
- `identities` accepts owner name/email strings or regular expressions. A commit
  counts only when its author or a co-author matches. When omitted, each repo's
  effective `user.name` and `user.email` Git configuration are used.
- `refScope` defaults to `"default"` for published default branches. `"remote"`
  scans all remote branches and `"all"` also includes local-only refs.
- `strict` defaults to `false` for backwards-compatible best-effort scans. Use
  `true` for published snapshots so a Git failure aborts the update. Repositories
  with no refs in the selected scope contribute zero and are not failures.
- The factory **throws if neither `repos` nor `roots` is provided.**
- `maxDepth` is optional and defaults to `6`.
- `rules` is optional and defaults to `AGENT_TRAILER_RULES`.
- `git` is optional and defaults to `"git"` (the executable to invoke).
- `name` is optional and defaults to `"local-git"`.

### Caveats

- **`FetchParams.user` is ignored.** Local authorship comes from `identities`,
  since one person can use different logins across hosts.
- **No colleague leakage.** Agent trailers on commits that do not match an owner
  identity are ignored, even when the repository is cloned locally.
- **Published by default.** Local-only branches count only with
  `refScope: "all"`.
- **SHA dedupe.** The same commit reached through multiple clones or linked
  worktrees is counted once.
- **Publish the output.** Because it reads private, local history, its result is
  meant to be turned into a static snapshot (see below) rather than fetched live
  from a browser.

## Composing with the rest of Streakr

Both providers return `ContributionDay[]`, but co-authored commits are already
part of the Git host total. Do not add the two series directly: that would count
the same commit once under `github` and again under its agent key. Use
`splitCoAuthored()` to subtract agent attributions from the GitHub remainder
before exposing both kinds of provider chip.

```ts
import {
  AGENT_TRAILER_RULES,
  githubProvider,
  githubCoAuthorProvider,
  splitCoAuthored,
} from "@rosado-io/streakr";

const params = { user: "octocat", start: "2026-01-01", end: "2026-12-31" };
const [githubDays, coauthoredDays] = await Promise.all([
  githubProvider({ token: process.env.GITHUB_TOKEN! }).fetchEvents(params),
  githubCoAuthorProvider({ token: process.env.GITHUB_TOKEN! }).fetchEvents(params),
]);

const perAgent = Object.fromEntries(
  AGENT_TRAILER_RULES.map(({ key }) => [
    key,
    coauthoredDays.map((day) => ({
      date: day.date,
      count: day.sources?.[key] ?? 0,
    })),
  ]),
);

const days = splitCoAuthored(githubDays, perAgent).map((day) => ({
  date: new Date(`${day.date}T00:00:00`),
  total: day.count,
  sources: day.sources,
}));
```

If one commit has trailers for multiple agents, each agent keeps one attribution.
In that case the summed attribution count can exceed the number of distinct
commits; `splitCoAuthored()` prevents host/agent duplication but intentionally
does not deduplicate different agent keys.

All provider chips start enabled and behave as independent toggles. Clicking an
agent chip removes or restores that agent's partition; it does not switch to an
exclusive single-provider mode. To show only one agent, disable the other chips
or call `setProviders()` with the desired provider state.

For a tokenless CI route, collect everything locally and atomically publish a
versioned snapshot:

```ts
import {
  githubCliProvider,
  githubCliCoAuthorProvider,
  gitlabCliProvider,
  createPublicSnapshot,
  writePublicSnapshot,
  STREAKR_SNAPSHOT_SCHEMA_VERSION,
} from "@rosado-io/streakr/agents";

const params = { user: "octocat", start: "2026-01-01", end: "2026-12-31" };

const [github, gitlab, agents] = await Promise.all([
  githubCliProvider().fetchEvents(params),
  gitlabCliProvider().fetchEvents(params),
  githubCliCoAuthorProvider().fetchEvents(params),
]);

const snapshot = createPublicSnapshot({
  range: { start: params.start, end: params.end },
  activity: { github, gitlab },
  agents,
});
await writePublicSnapshot("public/contributions.json", snapshot);
```

`createPublicSnapshot` accepts `range`, `activity`, and `agents`. `activity` is a
record of provider name to `ContributionDay[]` (for example `{ github, gitlab }`),
and `agents` is a `ContributionDay[]` keyed per agent in `sources`. `generatedAt`
is optional and defaults to the current ISO timestamp; the resulting snapshot
also carries `schemaVersion`, which is exported as `STREAKR_SNAPSHOT_SCHEMA_VERSION`.

Authenticate once with `gh auth login` and `glab auth login --use-keyring`. The
providers execute those CLIs and parse their JSON; they never request a token or
place one in arguments, files, snapshots, or CI. The GitLab session only needs
the read-only `read_user` scope for the Events API.

## CLI providers

`githubCliProvider`, `gitlabCliProvider`, and `githubCliCoAuthorProvider` live
in the Node-only `./agents` subpath. They reuse authenticated local CLI sessions
instead of accepting tokens, so they fit CI jobs or local scripts where writing a
PAT to config is undesirable.

All three factories accept these options:

```ts
githubCliProvider({
  host: "github.com", // GitHub CLI hostname
  cli: "gh",          // executable name
  runner: runLocalCli,
  name: "github",
});

gitlabCliProvider({
  host: "gitlab.com", // GitLab CLI hostname
  cli: "glab",        // executable name
  runner: runLocalCli,
  name: "gitlab",
});

githubCliCoAuthorProvider({
  agents: ["claude", "codex", "opencode", "copilot"],
  host: "github.com",
  cli: "gh",
  runner: runLocalCli,
  name: "github-agents",
});
```

- `host` is optional and defaults to the public host (`github.com` or
  `gitlab.com`). Point it at an Enterprise host to reuse an existing `gh`/`glab`
  login there.
- `cli` is optional and defaults to `gh` or `glab`. Use it when the executable is
  not on `PATH` under its default name.
- `runner` is optional and defaults to the built-in runner. Swap it in tests or
  sandboxed environments.
- `name` is optional and defaults to `"github"`, `"gitlab"`, or
  `"github-agents"`. Override it when aggregating multiple hosts side by side.
- `agents` (co-author provider only) is optional and defaults to every key in
  `AGENT_TRAILER_RULES`.

`githubCliProvider` returns the same contribution calendar as
`githubProvider`, and `gitlabCliProvider` returns the same events as
`gitlabProvider`. `githubCliCoAuthorProvider` returns the same co-author counts
as `githubCoAuthorProvider`. All three throw a clear error if the CLI is not
installed or not authenticated.

## Deployment patterns for the local route

The local scan reads private history, so it should never run in a browser. Run
it where the repos live and publish only a `PublicStreakrSnapshot`. It contains
only schema version, generation time, range, dates, counts, and source keys — no
paths, messages, emails, hashes, or repository names.

- **Commit a snapshot locally.** A local scheduled job runs the scan, writes the
  snapshot atomically, and pushes it. CI only builds the sanitized file.
- **Update a gist from a local cron/hook.** A cron job or Git `post-commit` hook
  runs the scan and `PATCH`es a secret gist; the site fetches the gist's raw URL.
  Keeps the site static while refreshing on your schedule.
- **POST to a self-owned endpoint.** The scan pushes the series to your own
  backend — a Cloudflare Worker + KV, a Firebase collection, or any small API —
  and the site reads it from there. Best when you want auth or per-viewer scoping.

## Privacy

- **Metadata only.** The providers read commit metadata — dates, authorship,
  and `Co-authored-by:` trailers. They never read transcripts, prompts, diffs, or
  message content.
- **Counts still reveal patterns.** Daily contribution counts expose work cadence
  the same way any contribution calendar does. The
  [README privacy guidance](../README.md#privacy) applies: aggregate, redact, or
  limit ranges before publishing, and keep tokens out of browser code.
- **Fail closed.** `writePublicSnapshot()` writes a temporary private file and
  renames it only after a complete, validated snapshot exists. A failed provider
  leaves the last known-good snapshot untouched.

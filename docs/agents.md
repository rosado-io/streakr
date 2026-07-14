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

- `GitHubCoAuthorProvider` (main entry) queries the GitHub commit search API.
- `LocalGitCoAuthorProvider` (`@rosado-io/streakr/agents`, Node-only) scans local
  clones with `git log`.

Both compose with `aggregate()` and `normalizeEventsToDaily()` exactly like the
[Git host providers](./providers.md).

> ⚠️ **Availability.** `GitHubCoAuthorProvider` (main entry `@rosado-io/streakr`)
> and `LocalGitCoAuthorProvider` (subpath `@rosado-io/streakr/agents`) land in
> PRs [#156](https://github.com/rosado-io/streakr/pull/156) and
> [#157](https://github.com/rosado-io/streakr/pull/157). They ship starting with
> the release that includes those PRs; until then the imports in this guide will
> not resolve against the published package.

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

| Agent | Key | Matched by | Sample trailer |
| --- | --- | --- | --- |
| Claude Code | `claude` | email `noreply@anthropic.com` | `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>` |
| Codex | `codex` | email `noreply@openai.com` | `Co-authored-by: Codex <noreply@openai.com>` |
| opencode | `opencode` | email `noreply@opencode.ai` | `Co-authored-by: opencode (glm-5.2) <noreply@opencode.ai>` |
| Copilot | `copilot` | name contains `copilot` + email ending `@users.noreply.github.com` | `Co-authored-by: Copilot <198982749+Copilot@users.noreply.github.com>` |

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

| | `GitHubCoAuthorProvider` | `LocalGitCoAuthorProvider` |
| --- | --- | --- |
| Source | GitHub commit search API | `git log --all` over local clones |
| Scope | Default branch only | All branches, all hosts |
| Hosts | GitHub public repos (private with `repo` PAT) | Anything cloned locally — GitLab, self-hosted, unpushed |
| Auth | GitHub PAT | None (runs where the repos live) |
| Publication step | None — safe to call server-side on demand | Required — output is meant to be published as a static snapshot |
| Indexing lag | Yes (search index) | No |

### Why the numbers differ

Measured against the same set of work:

- **API route:** 233 commits via 3 search requests.
- **Local route:** 397 commits across 14 repos in ~0.3 s.

The local scan sees more because:

- **Branches.** The search API only indexes the default branch; the local scan
  reads every branch via `git log --all`.
- **Hosts and unpublished work.** The local scan covers repos that never reached
  GitHub — GitLab, self-hosted, or not yet pushed.
- **Indexing lag.** Recently pushed commits may not be searchable yet.
- **Copilot authorship.** The GitHub coding agent's commits are sometimes
  authored by the bot itself, so an `author:<user>` search misses them (measured:
  132 Copilot commits found by the local scan vs 14 via search).

Rule of thumb: use the API route for a zero-infrastructure server-side fetch of
public GitHub work; use the local route when you want the full, cross-host
picture and can publish a snapshot.

## `GitHubCoAuthorProvider`

Counts commits co-authored by agents through the GitHub commit search API. For
each agent it runs a query shaped like
`author:<user> "co-authored-by: <match>" author-date:<start>..<end>` and buckets
the results by day, keyed per agent in `sources`.

```ts
import { GitHubCoAuthorProvider } from "@rosado-io/streakr";

const agents = new GitHubCoAuthorProvider({
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
new GitHubCoAuthorProvider({
  token: "ghp_...",
  agents: ["claude", "codex", "opencode", "copilot"],
  endpoint: "https://api.github.com/search/commits",
  fetch: customFetch,
});
```

- `token` is required.
- `agents` is optional and defaults to every key in the registry (`claude`,
  `codex`, `opencode`, `copilot`).
- `endpoint` is optional and defaults to
  `https://api.github.com/search/commits`.
- `fetch` is optional and defaults to global `fetch`.

The provider `name` is `"github-agents"`. `user`, `start`, and `end` come from
the `fetchEvents` params.

### Caveats

- **Default branch only.** The commit search API does not index other branches.
- **Forks are skipped** by the search API.
- **Indexing lag.** Freshly pushed commits may not be searchable immediately.
- **Copilot undercount.** Commits authored by the Copilot bot itself are not
  matched by `author:<user>`.
- **Private repos** require a PAT with `repo` scope.
- **Run server-side.** Keep the PAT out of browser bundles.

## `LocalGitCoAuthorProvider`

Scans local repositories with `git log --all`, parses `Co-authored-by:` trailers
against the registry, dedupes by commit SHA, and buckets by day keyed per agent.
Because it runs where the repos live, it sees every branch and host — including
GitLab, self-hosted, and never-pushed work — without a token.

This provider lives in the Node-only subpath:

```ts
import { LocalGitCoAuthorProvider } from "@rosado-io/streakr/agents";

const local = new LocalGitCoAuthorProvider({
  roots: ["/Users/me/code"],
});

const days = await local.fetchEvents({
  start: "2026-01-01",
  end: "2026-12-31",
  user: "ignored",
});
```

### Options

```ts
new LocalGitCoAuthorProvider({
  repos: ["/Users/me/code/streakr"],
  roots: ["/Users/me/code"],
  maxDepth: 6,
  rules: AGENT_TRAILER_RULES,
  git: "git",
});
```

- `repos` is an explicit list of repository paths to scan.
- `roots` are directories to walk (up to `maxDepth`) looking for repos.
- The constructor **throws if neither `repos` nor `roots` is provided.**
- `maxDepth` is optional and defaults to `6`.
- `rules` is optional and defaults to `AGENT_TRAILER_RULES`.
- `git` is optional and defaults to `"git"` (the executable to invoke).

### Caveats

- **`FetchParams.user` is ignored.** The "user" is the owner of the local repos;
  only `start` and `end` narrow the range.
- **SHA dedupe.** The same commit reached through multiple clones or linked
  worktrees is counted once.
- **Publish the output.** Because it reads private, local history, its result is
  meant to be turned into a static snapshot (see below) rather than fetched live
  from a browser.

## Composing with the rest of Streakr

Both providers return `ContributionDay[]`, so they drop into `aggregate()` and
`normalizeEventsToDaily()` alongside the Git host providers. `aggregate()` tags
each returned day with the provider `name` in `sources`, while the per-agent keys
the provider already set (`claude`, `codex`, …) are preserved.

```ts
import {
  aggregate,
  GitHubProvider,
  GitHubCoAuthorProvider,
  normalizeEventsToDaily,
} from "@rosado-io/streakr";

const events = await aggregate(
  [
    new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
    new GitHubCoAuthorProvider({ token: process.env.GITHUB_TOKEN! }),
  ],
  { user: "octocat", start: "2026-01-01", end: "2026-12-31" },
);

const days = normalizeEventsToDaily(events).map((day) => ({
  date: new Date(`${day.date}T00:00:00`),
  total: day.count,
  sources: day.sources,
}));
```

For the local route you typically fetch once, then publish the daily series:

```ts
import { LocalGitCoAuthorProvider } from "@rosado-io/streakr/agents";
import { normalizeEventsToDaily } from "@rosado-io/streakr";

const local = new LocalGitCoAuthorProvider({ roots: [process.env.CODE_ROOT!] });

const raw = await local.fetchEvents({
  user: "",
  start: "2026-01-01",
  end: "2026-12-31",
});

const days = normalizeEventsToDaily(raw); // { date, count, sources }
```

Pair the agent chips (`AGENT_PROVIDERS`) with the daily series so the heatmap can
toggle by agent — see the [agent providers preset](../README.md#agent-providers-preset).

## Deployment patterns for the local route

The local scan reads private history, so it should never run in a browser. Run
it where the repos live and publish only the daily series. In every pattern below
**only `{ date, count, sources }` leaves the machine** — no paths, no messages,
no repo names.

- **Commit a snapshot at build time.** A build script runs the scan, writes
  `agents.json`, and commits it. The site imports/fetches that file. Simplest
  option; updates on each build.
- **Update a gist from a local cron/hook.** A cron job or Git `post-commit` hook
  runs the scan and `PATCH`es a secret gist; the site fetches the gist's raw URL.
  Keeps the site static while refreshing on your schedule.
- **POST to a self-owned endpoint.** The scan pushes the series to your own
  backend — a Cloudflare Worker + KV, a Firebase collection, or any small API —
  and the site reads it from there. Best when you want auth or per-viewer scoping.

## Privacy

- **Metadata only.** Both providers read commit metadata — dates, authorship,
  and `Co-authored-by:` trailers. They never read transcripts, prompts, diffs, or
  message content.
- **Counts still reveal patterns.** Daily contribution counts expose work cadence
  the same way any contribution calendar does. The
  [README privacy guidance](../README.md#privacy) applies: aggregate, redact, or
  limit ranges before publishing, and keep tokens out of browser code.
- **Local output is the sensitive surface.** For `LocalGitCoAuthorProvider`,
  publish only the normalized `{ date, count, sources }` series — never repo paths
  or raw log output.

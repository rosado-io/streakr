# Providers

Providers fetch contribution activity from Git hosts and return Streakr's shared
`ContributionDay[]` shape. They are optional utilities: you can use them with
`createStreakr`, or use the normalized data in your own calendar/grid UI.

```ts
type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  sources?: Record<string, number>;
};
```

All provider fetches use `{ user, start, end }`, where dates are inclusive,
must be in `YYYY-MM-DD` format, and must satisfy `start <= end`.

Recommended production shape:

- Fetch provider data on a server, scheduled job, or authenticated backend proxy.
- Keep Personal Access Tokens (PATs) out of browser bundles.
- Cache by `{ provider, user, start, end }` to reduce rate-limit pressure.
- Send only the daily counts needed by the client.

## GitHub

`GitHubProvider` uses the GitHub GraphQL API and the
`contributionsCollection.contributionCalendar` field. It returns a canonical
daily series for the requested range, including zero-count days.

```ts
import { GitHubProvider } from "@rosado-io/streakr";

const github = new GitHubProvider({
  token: process.env.GITHUB_TOKEN!,
});

const days = await github.fetchEvents({
  user: "octocat",
  start: "2025-01-01",
  end: "2025-12-31",
});
```

### Options

```ts
new GitHubProvider({
  token: "ghp_...",
  endpoint: "https://api.github.com/graphql",
  fetch: customFetch,
});
```

- `token` is required and must be a non-empty GitHub Personal Access Token.
- `endpoint` is optional and defaults to `https://api.github.com/graphql`.
- `fetch` is optional and defaults to global `fetch`.

### Token Scopes

Recommended minimum:

- `read:user` for user/profile contribution access.

For private contribution visibility, use a token that can read the relevant
private repositories:

- Classic PATs usually need `repo`.
- Fine-grained PATs need equivalent repository access for the repositories you
  want reflected in the contribution calendar.

### Rate Limits

GitHub GraphQL uses a points-based limit. The provider includes `rateLimit`
details in GraphQL error messages when GitHub returns them, including remaining
points and reset time.

For heavy usage:

- Cache responses by `{ provider, user, start, end }`.
- Avoid repeatedly fetching large date windows.
- Prefer server-side scheduled refreshes for public profile pages.

### Failure Behavior

`fetchEvents()` throws when:

- The date range is invalid.
- GitHub returns HTTP or GraphQL errors.
- The requested GitHub user does not exist.
- The token cannot read the requested contribution calendar.

## GitLab

`GitLabProvider` uses the GitLab REST API. It resolves a username through
`/api/v4/users?username=...`, then fetches paginated user events from
`/api/v4/users/:id/events`. It returns a canonical daily series for the
requested range, including zero-count days.

```ts
import { GitLabProvider } from "@rosado-io/streakr";

const gitlab = new GitLabProvider({
  token: process.env.GITLAB_TOKEN!,
});

const days = await gitlab.fetchEvents({
  user: "johndoe",
  start: "2025-01-01",
  end: "2025-12-31",
});
```

### Options

```ts
new GitLabProvider({
  token: "glpat_...",
  baseUrl: "https://gitlab.com",
  fetch: customFetch,
});
```

- `token` is required and must be a non-empty GitLab Personal Access Token.
- `baseUrl` is optional and defaults to `https://gitlab.com`.
- `fetch` is optional and defaults to global `fetch`.

### Self-Hosted GitLab

Set `baseUrl` to the origin of your GitLab instance:

```ts
const gitlab = new GitLabProvider({
  token: process.env.GITLAB_TOKEN!,
  baseUrl: "https://gitlab.example.com",
});
```

Do not include `/api/v4`; the provider adds that path internally.

### Token Scopes

Recommended scopes:

- `read_user` to resolve users.
- `read_api` to read user activity events.

Use the narrowest token that can read the activity you need. For self-hosted
instances, confirm the instance's token policy and event visibility settings.

### Pagination and Rate Limits

The provider requests up to 100 events per page and follows GitLab `Link` headers
with `rel="next"` until all pages in the range are collected.

For heavy usage:

- Cache normalized results.
- Keep date windows bounded.
- Prefer backend fetching so tokens stay out of the browser.

### Failure Behavior

`fetchEvents()` throws when:

- The date range is invalid.
- The GitLab user cannot be resolved.
- GitLab returns an HTTP error while resolving users or fetching events.
- The token cannot read the requested user's event stream.

## GitHub Agent Co-Authors

`GitHubCoAuthorProvider` counts commits co-authored by coding agents using the
GitHub commit search API. For each configured agent it queries
`/search/commits` with `author:<user>`, a `"co-authored-by: <match>"` phrase,
and an `author-date:<start>..<end>` range, then buckets results by author date
into a canonical daily series. Each day's `sources` are keyed per agent (for
example `{ claude: 3 }`).

Because it works exactly like `GitHubProvider` (PAT plus HTTP), it needs no
access to the developer's machine and fits portfolio or static deployments with
no publication step.

```ts
import { GitHubCoAuthorProvider } from "@rosado-io/streakr";

const agents = new GitHubCoAuthorProvider({
  token: process.env.GITHUB_TOKEN!,
});

const days = await agents.fetchEvents({
  user: "rosado-io",
  start: "2025-01-01",
  end: "2025-12-31",
});
```

Each returned day carries per-agent counts:

```ts
// { date: "2025-03-15", count: 4, sources: { claude: 3, codex: 1 } }
```

### Options

```ts
new GitHubCoAuthorProvider({
  token: "ghp_...",
  agents: ["claude", "codex"],
  endpoint: "https://api.github.com/search/commits",
  fetch: customFetch,
});
```

- `token` is required and must be a non-empty GitHub Personal Access Token.
- `agents` is optional and defaults to every key in `AGENT_TRAILER_RULES`
  (`claude`, `codex`, `opencode`, `copilot`). Each key must exist in the
  registry or the constructor throws. The searched co-author is the rule's
  email when it is a literal string, otherwise its name.
- `endpoint` is optional and defaults to `https://api.github.com/search/commits`.
- `fetch` is optional and defaults to global `fetch`.

### Pagination and Range Splitting

Commit search returns up to 100 results per page and caps every query at 1000
results. When a range reports more than 1000 matches, the provider splits it in
half and re-queries each half, recursing until every sub-range fits under the
cap (year to quarters to months in practice). Ranges under the cap are simply
paged through.

### Rate Limits

Commit search allows roughly 30 requests per minute. The provider queries the
configured agents sequentially to stay within that budget. A `403` or `429`
response is surfaced as a clear secondary-rate-limit error.

For heavy usage:

- Cache normalized results by `{ provider, user, start, end }`.
- Keep date windows bounded.
- Prefer backend fetching so tokens stay out of the browser.

### Known Limitations

- Commit search only indexes the default branch and skips forks, with a slight
  indexing lag.
- Copilot's coding-agent commits are sometimes authored by the bot itself, so
  `author:<user>` misses them.
- Private repositories require the same `repo`-scoped PAT as `GitHubProvider`;
  server-side usage is recommended.

### Failure Behavior

`fetchEvents()` throws when:

- The date range is invalid.
- A configured agent key is unknown (at construction time).
- GitHub returns an HTTP error or a secondary rate limit.

## Aggregating Providers

Use `aggregate()` to fetch from multiple providers concurrently:

```ts
import {
  aggregate,
  GitHubProvider,
  GitLabProvider,
  normalizeEventsToDaily,
} from "@rosado-io/streakr";

const raw = await aggregate(
  [
    new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
    new GitLabProvider({ token: process.env.GITLAB_TOKEN! }),
  ],
  { user: "octocat", start: "2025-01-01", end: "2025-12-31" },
);

const days = normalizeEventsToDaily(raw);
```

Each successful provider's events are tagged in `sources` with the provider name.
`aggregate()` returns those tagged provider entries; `normalizeEventsToDaily()`
then merges same-date entries into a single daily series and fills gaps. If one
provider fails, `aggregate()` skips it and returns data from the providers that
succeeded.

If you need fail-fast behavior, call each provider's `fetchEvents()` directly and
handle errors in your application.

## Using Provider Data with `createStreakr`

Provider utilities return string dates (`YYYY-MM-DD`) and `count`. The component
expects `Date` objects and `total`, so map the normalized output before passing
it into `getDays`:

```ts
import { createStreakr, normalizeEventsToDaily } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const normalized = normalizeEventsToDaily(raw);
const componentDays = normalized.map((day) => ({
  date: new Date(`${day.date}T00:00:00`),
  total: day.count,
  sources: day.sources,
}));

createStreakr({
  target: document.getElementById("streakr")!,
  years: [2025],
  getDays: () => componentDays,
});
```

## Custom Providers

Implement the `Provider` interface to connect another source:

```ts
import type { ContributionDay, FetchParams, Provider } from "@rosado-io/streakr";

class MyProvider implements Provider {
  readonly name = "my-provider";

  async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    return [
      { date: params.start, count: 1 },
      { date: params.end, count: 3 },
    ];
  }
}
```

Provider output can contain gaps and duplicate dates. Call
`normalizeEventsToDaily()` before computing streaks or building a grid.

## Privacy and Token Handling

- Treat GitHub and GitLab PATs as secrets.
- Do not ship PATs in public browser code, static HTML, or client-side
  environment variables.
- Prefer backend fetching for real user data. Browser-side fetching is suitable
  only for demos with disposable or intentionally public credentials.
- Contribution counts can reveal private work cadence. Limit date ranges,
  aggregate results, or omit private providers when publishing public profiles.
- Store cached provider responses with the same access controls as the source
  data.

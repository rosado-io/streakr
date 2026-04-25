# Providers

Providers fetch contribution activity and return Streakr's shared
`ContributionDay[]` shape:

```ts
type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  sources?: Record<string, number>;
};
```

All provider fetches use `{ user, start, end }`, where dates must be in
`YYYY-MM-DD` format and `start <= end`.

## GitHub

`GitHubProvider` uses the GitHub GraphQL API and the
`contributionsCollection.contributionCalendar` field.

```ts
import { GitHubProvider } from "streakr";

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

## GitLab

`GitLabProvider` uses the GitLab REST API. It resolves a username through
`/api/v4/users?username=...`, then fetches paginated user events from
`/api/v4/users/:id/events`.

```ts
import { GitLabProvider } from "streakr";

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

## Aggregating Providers

Use `aggregate()` to fetch from multiple providers concurrently:

```ts
import { aggregate, GitHubProvider, GitLabProvider, normalizeEventsToDaily } from "streakr";

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
If one provider fails, `aggregate()` skips it and returns data from the providers
that succeeded.

## Custom Providers

Implement the `Provider` interface to connect another source:

```ts
import type { ContributionDay, FetchParams, Provider } from "streakr";

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

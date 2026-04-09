# streakr
The universal Git contribution calendar. Aggregate activity from GitHub, GitLab, and more into one beautiful, framework-agnostic heatmap.

## GitHub provider (GraphQL)

`streakr` includes a GitHub provider backed by GraphQL `contributionsCollection`.

```ts
import { GitHubProvider, aggregate, normalizeEventsToDaily } from "streakr";

const github = new GitHubProvider({
  token: process.env.GITHUB_TOKEN!,
});

const raw = await aggregate([github], {
  user: "octocat",
  start: "2025-01-01",
  end: "2025-12-31",
});

// Canonical daily series (sorted, gap-free)
const daily = normalizeEventsToDaily(raw);
```

### PAT scopes (minimum)

- Recommended minimum for user/profile contribution access: `read:user`
- If you want private contribution visibility, use a token that can read private repos
  (`repo` for classic PATs, or equivalent fine-grained repository permissions)

### Rate limits

- GitHub GraphQL uses a points-based limit per hour (commonly 5,000 points/hour for user tokens)
- This provider queries `rateLimit` and includes `remaining`/`resetAt` context in GraphQL error messages
- For heavy usage, cache responses and reduce query frequency/window size

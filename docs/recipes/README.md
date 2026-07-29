# Data recipes

Streakr only presents data. Every recipe in this directory is optional,
application-owned acquisition code whose output is `StreakrDay[]`.

| Recipe                                       | Runs in                | Use it when                                  |
| -------------------------------------------- | ---------------------- | -------------------------------------------- |
| [GitHub public calendar](github.md)          | Browser, server, build | Public contribution counts are sufficient.   |
| [Custom API](custom-api.md)                  | Browser                | Your backend owns auth, caching, and schema. |
| [Local Git snapshot](local-git.md)           | Node or CI             | Data should be generated from local clones.  |
| [Merge several sources](multiple-sources.md) | Any JavaScript runtime | Several collectors feed one visualization.   |

Recipes are deliberately copied into the consuming project. This keeps API
tokens, infrastructure assumptions, retry policy, and third-party API changes
outside Streakr's presentation contract.

Every recipe should finish with data shaped like:

```ts
import type { StreakrDay } from "@rosado-io/streakr";

const days: StreakrDay[] = [
  {
    date: "2026-07-28",
    count: 7,
    sources: { github: 5, gitlab: 2 },
  },
];
```

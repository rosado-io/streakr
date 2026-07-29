# Local Git snapshot recipe

Run this recipe with Node in a trusted local or CI environment. It counts commits
by author date and writes a static JSON file for the browser.

```ts
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { StreakrDay } from "@rosado-io/streakr";

const execFileAsync = promisify(execFile);

export async function getLocalGitDays(
  repository: string,
  start: string,
  end: string,
): Promise<StreakrDay[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--no-merges", `--since=${start}T00:00:00`, `--until=${end}T23:59:59`, "--format=%as"],
    { cwd: repository },
  );

  const counts = new Map<string, number>();
  for (const date of stdout.split(/\r?\n/).filter(Boolean)) {
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({
      date,
      count,
      sources: { local: count },
    }));
}

const days = await getLocalGitDays("/absolute/path/to/repository", "2026-01-01", "2026-12-31");
await writeFile("public/activity.json", `${JSON.stringify(days, null, 2)}\n`);
```

`execFile` receives an argument array and does not interpolate a shell command.
Decide explicitly which repository, refs, identities, and merge commits belong
in your product's definition of activity.

# GitHub public calendar recipe

This example adapts the public response from
`github-contributions-api.jogruber.de`. It is a community service, not part of
Streakr or GitHub. Review its availability and privacy characteristics before
depending on it in production.

```ts
import type { StreakrDay } from "@rosado-io/streakr";

interface GitHubCalendarPayload {
  contributions?: Array<{
    date?: unknown;
    count?: unknown;
    total?: unknown;
  }>;
}

export async function getGitHubDays(user: string, year: number): Promise<StreakrDay[]> {
  const url = new URL(
    `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}`,
  );
  url.searchParams.set("y", String(year));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub calendar request failed (${response.status})`);
  }

  const payload = (await response.json()) as GitHubCalendarPayload;
  if (!Array.isArray(payload.contributions)) {
    throw new Error("GitHub calendar returned an invalid payload");
  }

  return payload.contributions.map((day) => {
    if (
      typeof day.date !== "string" ||
      (typeof day.total !== "number" && typeof day.count !== "number")
    ) {
      throw new Error("GitHub calendar returned an invalid day");
    }
    const count = typeof day.total === "number" ? day.total : (day.count as number);
    return {
      date: day.date,
      count,
      sources: { github: count },
    };
  });
}
```

Load it outside the renderer:

```ts
const days = await getGitHubDays("octocat", 2026);

createStreakr({
  target,
  years: [2026],
  days,
});
```

For private activity, put an authenticated GitHub GraphQL adapter on your server
or in CI and expose only the resulting daily contract to the browser.

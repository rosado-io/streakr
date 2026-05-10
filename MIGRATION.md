# Migration guide

## 0.1.x → 0.2.x

Streakr 0.2 replaces the functional render API with a stateful component
(`createStreakr`). The lower-level data utilities (`buildCalendarGrid`,
`computeStreaks`, `normalizeEventsToDaily`) and the provider classes
(`GitHubProvider`, `GitLabProvider`, `aggregate`) are unchanged.

### TL;DR for an automated migration

1. Replace any import of `renderContributionWidget`, `renderSvgCalendar`,
   `themes`, or `createCssVarTheme` with `createStreakr`.
2. Add `import "@rosado-io/streakr/styles.css"` next to that import.
3. Replace the `renderContributionWidget(el, { grid, metrics, theme })` call
   with `createStreakr({ target: el, years, getDays, theme, accent })`.
4. Where you used to build days as `{ date: "YYYY-MM-DD", count }`, switch to
   `{ date: new Date("YYYY-MM-DD"), total, sources?: { github, gitlab, bitbucket } }`.
5. Delete the `metrics` array — the component renders the four stat cards itself.
6. If your bundler caches dependencies (Vite, Snowpack, etc.), clear its cache
   once. With Vite: `rm -rf node_modules/.vite`.

### Removed exports

| Removed in 0.2 | Replacement |
| --- | --- |
| `renderContributionWidget(el, opts)` | `createStreakr({ target: el, ... })` |
| `renderSvgCalendar(el, grid, theme)` | rendered internally by `createStreakr` |
| `themes` (`classicGreen`, `dark`, `system`) | `theme: "dark" \| "light"` + `accent: "#hex"` |
| `createCssVarTheme(...)` | CSS variables on `.sk-root` (`--sk-accent`, `--sk-heat-{0..4}`) |
| `ContributionWidgetOptions` | `StreakrOptions` |
| `ContributionMetric`, `WidgetSize`, `WidgetStatsPosition`, `WidgetLegend` | the component renders metrics, sizing, and the legend itself |
| `Theme`, `ThemeColorScale`, `ThemeColorScheme` | replaced by CSS variables |

### Day shape

`createStreakr` consumes a different `Day` shape than the old
`buildCalendarGrid`:

```ts
// 0.1.x — ContributionDay (still exported, used by the lower-level utilities)
interface ContributionDay {
  date: string;             // "YYYY-MM-DD"
  count: number;
  sources?: Record<string, number>;
}

// 0.2.x — StreakrDay (consumed by createStreakr)
interface StreakrDay {
  date: Date;               // real Date, not a string
  total: number;            // not "count"
  sources?: Record<string, number>;
}
```

If you fetch JSON with string dates, map them once:

```ts
const days: StreakrDay[] = raw.map((d) => ({
  date: new Date(d.date),
  total: d.total ?? d.count ?? 0,
  sources: d.sources,
}));
```

`total` is recomputed by the component when toggling providers, so the value
you pass should be the "all providers active" total — equal to `sum(sources)`.

### Theming

The five-color palette and explicit theme objects are gone. The component
ships dark/light tokens via CSS variables and an `accent` option that can
optionally tint the heatmap palette.

```ts
// 0.1.x
import { renderContributionWidget, themes, createCssVarTheme } from "@rosado-io/streakr";
renderContributionWidget(el, { grid, metrics, theme: themes.dark });
```

```ts
// 0.2.x
import { createStreakr } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";
createStreakr({
  target: el,
  theme: "dark",       // "dark" | "light"
  accent: "#39d353",   // any CSS color
  tintHeatmap: true,   // default — derives the heatmap palette from `accent`
  years: [2024, 2025, 2026],
  getDays: (year) => fetchActivity(year),
});
```

To override individual heat steps or surface tokens, set CSS variables on the
mounted root:

```css
.sk-root {
  --sk-heat-4: #ff4dd9;
  --sk-surface-1: #08111e;
}
```

### Side-by-side example

```ts
// ─── 0.1.x ─────────────────────────────────────────────────
import {
  buildCalendarGrid,
  computeStreaks,
  renderContributionWidget,
  themes,
  type ContributionDay,
} from "@rosado-io/streakr";

const days: ContributionDay[] = await fetchDays();
const grid = buildCalendarGrid(days);
const streaks = computeStreaks(days);

renderContributionWidget(document.querySelector("#streakr")!, {
  grid,
  metrics: [
    { label: "Total", value: streaks.total },
    { label: "Best streak", value: `${streaks.bestStreak} days` },
    { label: "Current streak", value: `${streaks.currentStreak} days` },
  ],
  theme: themes.dark,
  legend: { less: "Less", more: "More" },
});
```

```ts
// ─── 0.2.x ─────────────────────────────────────────────────
import { createStreakr, type StreakrDay } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

createStreakr({
  target: document.querySelector<HTMLElement>("#streakr")!,
  theme: "dark",
  accent: "#39d353",
  years: [2024, 2025, 2026],
  year: 2026,
  getDays: (year): StreakrDay[] => fetchDays(year),
});
```

The component renders the four stat cards (Total, Best Streak, Current
Streak, Active Days), the year tabs, the year picker modal, the provider
chips, the legend, and the tooltip itself. There is no `metrics` argument
to assemble — pass the data and the chrome shows up.

### CSS import

The new component requires the stylesheet. The package exposes it at
`@rosado-io/streakr/styles.css`:

```ts
import "@rosado-io/streakr/styles.css";
```

If you serve the lib from a CDN:

```html
<link rel="stylesheet" href="https://esm.sh/@rosado-io/streakr/styles.css" />
```

### Custom providers

The default chip row shows GitHub, GitLab, and Bitbucket with built-in
icons. If you connect to other hosts, pass your own `providers` array — the
key matches `StreakrDay.sources`:

```ts
createStreakr({
  target: el,
  years: [2026],
  providers: [
    { key: "gitea",   name: "Gitea",   color: "#609926" },
    { key: "forgejo", name: "Forgejo", color: "#d97706" },
  ],
  getDays: (year) => myFetchActivity(year),
});
```

> ⚠️ Security: `provider.icon` is inserted as raw HTML. Never forward
> user-supplied SVG without sanitizing it (e.g. with DOMPurify).

### Bundler caches

Some bundlers cache the prebuilt dependency graph and will serve stale exports
after a major bump:

- **Vite**: `rm -rf node_modules/.vite && pnpm dev`
- **Astro / Nuxt 3 / SvelteKit**: same as Vite (they all use it under the hood)
- **Next.js**: `rm -rf .next`
- **Turbopack**: `rm -rf .next` (or `.turbo`)
- **webpack / Rspack**: usually fine; if not, delete the cache directory
  configured in your project (`.webpack-cache`, `.rspack-cache`, etc.)

If you see `does not provide an export named 'renderContributionWidget'` or a
`504 (Outdated Optimize Dep)` warning in the console after upgrading, that's
the cache — clear it once and you're done.

### Lower-level utilities (unchanged)

These still exist and behave the same way as in 0.1.x:

- `normalizeEventsToDaily(events)`
- `computeStreaks(days)`
- `buildCalendarGrid(days, options?)`
- `aggregate(providers, params)`
- `GitHubProvider`, `GitLabProvider`

Use them if you want to fetch real data from a Git host and shape it for
`createStreakr` (or for any custom rendering you build yourself).

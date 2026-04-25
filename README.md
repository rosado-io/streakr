# Streakr

Streakr is a universal Git contribution calendar for building streak widgets, profile
cards, dashboards, and demos. It fetches activity from Git providers, normalizes it
into a shared daily format, computes streak metrics, and renders a framework-agnostic
SVG heatmap.

It currently ships providers for GitHub and GitLab, plus low-level utilities so you
can bring your own data source.

## Installation

Install from npm:

```sh
npm install streakr
```

Or use it directly in the browser through an ESM CDN:

```html
<script type="module">
  import {
    buildCalendarGrid,
    computeStreaks,
    normalizeEventsToDaily,
    renderContributionWidget,
  } from "https://esm.sh/streakr";
</script>
```

Streakr is published as ESM and CommonJS. It does not require a framework.

## Quickstart

```ts
import {
  GitHubProvider,
  aggregate,
  normalizeEventsToDaily,
  computeStreaks,
  buildCalendarGrid,
  renderContributionWidget,
  themes,
} from "streakr";

const provider = new GitHubProvider({
  token: process.env.GITHUB_TOKEN!,
});

const raw = await aggregate([provider], {
  user: "octocat",
  start: "2025-01-01",
  end: "2025-12-31",
});

const days = normalizeEventsToDaily(raw);
const streaks = computeStreaks(days);
const grid = buildCalendarGrid(days);

renderContributionWidget(document.querySelector<HTMLElement>("#streakr")!, {
  grid,
  metrics: [
    { label: "Total", value: streaks.total },
    { label: "Best streak", value: `${streaks.bestStreak} days` },
    { label: "Current streak", value: `${streaks.currentStreak} days` },
  ],
  theme: themes.system,
  legend: { less: "Less", more: "More" },
});
```

## Vanilla Browser Snippet

```html
<div id="streakr"></div>

<script type="module">
  import {
    buildCalendarGrid,
    computeStreaks,
    normalizeEventsToDaily,
    renderContributionWidget,
    themes,
  } from "https://esm.sh/streakr";

  const days = normalizeEventsToDaily([
    { date: "2025-06-01", count: 2 },
    { date: "2025-06-03", count: 5 },
  ]);
  const streaks = computeStreaks(days);

  renderContributionWidget(document.querySelector("#streakr"), {
    grid: buildCalendarGrid(days),
    metrics: [
      { label: "Total", value: streaks.total },
      { label: "Best streak", value: `${streaks.bestStreak} days` },
      { label: "Current streak", value: `${streaks.currentStreak} days` },
    ],
    theme: themes.classicGreen,
  });
</script>
```

## Framework Snippets

### React

```tsx
import { useEffect, useRef } from "react";
import { buildCalendarGrid, renderContributionWidget, themes } from "streakr";
import type { ContributionDay } from "streakr";

export function StreakrWidget({ days }: { days: ContributionDay[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderContributionWidget(ref.current, {
      grid: buildCalendarGrid(days),
      metrics: [{ label: "Total", value: days.reduce((sum, day) => sum + day.count, 0) }],
      theme: themes.system,
    });
  }, [days]);

  return <div ref={ref} />;
}
```

### Vue

```vue
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { buildCalendarGrid, renderContributionWidget, themes } from "streakr";
import type { ContributionDay } from "streakr";

const props = defineProps<{ days: ContributionDay[] }>();
const el = ref<HTMLElement | null>(null);

function render() {
  if (!el.value) return;
  renderContributionWidget(el.value, {
    grid: buildCalendarGrid(props.days),
    metrics: [{ label: "Total", value: props.days.reduce((sum, day) => sum + day.count, 0) }],
    theme: themes.system,
  });
}

onMounted(render);
watch(() => props.days, render, { deep: true });
</script>

<template>
  <div ref="el" />
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { afterUpdate, onMount } from "svelte";
  import { buildCalendarGrid, renderContributionWidget, themes } from "streakr";
  import type { ContributionDay } from "streakr";

  export let days: ContributionDay[] = [];
  let el: HTMLElement;

  function render() {
    renderContributionWidget(el, {
      grid: buildCalendarGrid(days),
      metrics: [{ label: "Total", value: days.reduce((sum, day) => sum + day.count, 0) }],
      theme: themes.system,
    });
  }

  onMount(render);
  afterUpdate(render);
</script>

<div bind:this={el}></div>
```

## Providers

Streakr includes first-party providers for GitHub and GitLab.

```ts
import { GitHubProvider, GitLabProvider, aggregate } from "streakr";

const raw = await aggregate(
  [
    new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
    new GitLabProvider({ token: process.env.GITLAB_TOKEN! }),
  ],
  { user: "octocat", start: "2025-01-01", end: "2025-12-31" },
);
```

See [docs/providers.md](docs/providers.md) for authentication, scopes, self-hosted
GitLab configuration, rate-limit notes, and custom provider guidance.

## API

### Data

- `aggregate(providers, params)` fetches events from provider implementations and
  returns one merged array. Failed providers are skipped.
- `normalizeEventsToDaily(events)` merges duplicate dates, fills gaps, and sorts
  the series.
- `computeStreaks(days)` returns total contributions, best streak, and current
  streak.
- `buildCalendarGrid(days, options?)` converts daily data into a week-by-day grid
  with intensity levels from `0` to `4`.

### Rendering

- `renderSvgCalendar(container, grid, theme?)` renders only the SVG heatmap.
- `renderContributionWidget(container, options)` renders the heatmap with summary
  metrics and an optional legend.
- `themes` contains `classicGreen`, `dark`, and `system`.
- `createCssVarTheme(options?)` creates a theme backed by CSS custom properties.

### Types

The package exports TypeScript types for provider contracts, contribution days,
calendar grids, themes, widget options, and fetch parameters.

```ts
import type { ContributionDay, Provider, Theme } from "streakr";
```

## Privacy

Streakr does not send data to any Streakr-owned service. Provider classes call the
configured Git host directly from the environment where your code runs.

Treat tokens as secrets:

- Do not expose GitHub or GitLab PATs in public browser code.
- Prefer server-side fetching or an authenticated backend proxy for real user data.
- Cache provider responses when possible to reduce API calls and rate-limit pressure.
- Store only the normalized contribution data you need for your product.

Rendered SVG output contains dates and contribution counts. Avoid rendering private
activity unless users have explicitly opted in.

## Development

```sh
pnpm install
pnpm test
pnpm build
```

## License

MIT

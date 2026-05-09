# Streakr

[![npm version](https://badge.fury.io/js/@rosado-io%2Fstreakr.svg)](https://www.npmjs.com/package/@rosado-io/streakr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/rosado-io/streakr/actions/workflows/ci.yml/badge.svg)](https://github.com/rosado-io/streakr/actions/workflows/ci.yml)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Streakr is a framework-agnostic, drop-in contribution-calendar component. It
unifies activity from any number of Git providers — GitHub, GitLab, Bitbucket,
or your own — into a single themeable heatmap with year tabs, provider toggles,
loading/empty/ready states, and an interactive tooltip.

The component is built in vanilla TypeScript: no React, no Vue, no runtime
dependencies. Drop it into any page or framework with two imports.

## Installation

```sh
npm install @rosado-io/streakr
```

Or load it from a CDN:

```html
<link rel="stylesheet" href="https://esm.sh/@rosado-io/streakr/styles.css" />
<script type="module">
  import { createStreakr } from "https://esm.sh/@rosado-io/streakr";
</script>
```

## Quickstart

```ts
import { createStreakr } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const sk = createStreakr({
  target: document.getElementById("streakr")!,
  theme: "dark",
  accent: "#39d353",
  years: [2024, 2025, 2026],
  year: 2026,
  getDays: (year) => [
    {
      date: new Date(2026, 0, 12),
      total: 5,
      sources: { github: 4, gitlab: 1 },
    },
    // ...one entry per day in the requested year
  ],
});

// Update reactively
sk.update({ theme: "light", accent: "#a371f7" });

// Tear down
sk.destroy();
```

The CSS file ships the dark/light tokens, accent tinting, modal, tooltip, and
skeleton. You can override any token with your own CSS variables (`--sk-*`).

## API

### `createStreakr(options): StreakrInstance`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `target` | `HTMLElement` | required | Where to mount the component. |
| `theme` | `"dark" \| "light"` | `"dark"` | Visual theme. |
| `accent` | `string` (CSS color) | `"#39d353"` | Drives chip/stat highlights and (optionally) the heatmap palette. |
| `tintHeatmap` | `boolean` | `true` | When true, the heatmap palette is derived from `accent`. |
| `showProviders` | `boolean` | `true` | Toggle the provider chip row. |
| `showStats` | `boolean` | `true` | Toggle the four-card stats grid. |
| `state` | `"loading" \| "empty" \| "ready"` | `"ready"` | Override the lifecycle state. |
| `years` | `number[]` | required | Years offered in the year tabs / picker. |
| `year` | `number` | last `years` entry | Currently selected year. |
| `getDays` | `(year) => StreakrDay[]` | required | Returns the days for a given year. |
| `providers` | `StreakrProvider[]` | `[github, gitlab, bitbucket]` | Provider configuration (see below). |
| `onYearChange` | `(year) => void` | — | Fires after the user picks a different year. |
| `onProviderToggle` | `(key, enabled, all) => void` | — | Fires after a provider chip is toggled. |

The returned `StreakrInstance` exposes `update(patch)`, `setYear(y)`,
`setProviders(next)`, and `destroy()`.

### `StreakrDay`

```ts
interface StreakrDay {
  date: Date;
  total: number;                       // sum across all providers
  sources?: Record<string, number>;    // keyed by `StreakrProvider.key`
}
```

The component recomputes `total` based on which providers are toggled on, so
the value you pass in should be the "all providers" total.

### `StreakrProvider`

```ts
interface StreakrProvider {
  key: string;     // matches a key in StreakrDay.sources
  name: string;    // display label
  color: string;   // dot/accent color in chips and tooltip
  icon?: string;   // optional inline SVG (built-in for github, gitlab, bitbucket)
}
```

## Custom providers

Built-in icons cover GitHub, GitLab, and Bitbucket. To support arbitrary
providers, pass your own `providers` array — anything goes:

```ts
createStreakr({
  target: el,
  years: [2026],
  providers: [
    { key: "gitea",   name: "Gitea",   color: "#609926" },
    { key: "forgejo", name: "Forgejo", color: "#d97706" },
    {
      key: "linear",
      name: "Linear",
      color: "#5e6ad2",
      icon: '<svg viewBox="0 0 24 24" width="13" height="13"><path d="…" fill="currentColor"/></svg>',
    },
  ],
  getDays: (year) => myFetchActivity(year), // each day has sources keyed by gitea/forgejo/linear
});
```

> ⚠️ **Security note on `icon`.** The string is inserted into the DOM as
> raw HTML. Only pass trusted, statically-defined SVG markup. Never forward
> user-supplied or remotely-fetched SVG without sanitizing it first (e.g.
> with [DOMPurify](https://github.com/cure53/DOMPurify)) — SVG can contain
> inline scripts and lead to XSS.

## Lifecycle states

```ts
sk.update({ state: "loading" });   // shimmer skeleton
sk.update({ state: "empty" });     // empty illustration with the active year
sk.update({ state: "ready" });     // normal render
```

`"ready"` with a year that has zero contributions automatically falls back to
the empty illustration.

## Framework snippets

The component is vanilla DOM — wrap it however you like.

### React

```tsx
import { useEffect, useRef } from "react";
import { createStreakr, type StreakrDay } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

export function StreakrWidget({
  years,
  getDays,
}: {
  years: number[];
  getDays: (year: number) => StreakrDay[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const sk = createStreakr({ target: ref.current, years, getDays });
    return () => sk.destroy();
  }, [years, getDays]);

  return <div ref={ref} />;
}
```

### Vue

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { createStreakr, type StreakrDay, type StreakrInstance } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const props = defineProps<{ years: number[]; getDays: (y: number) => StreakrDay[] }>();
const el = ref<HTMLElement | null>(null);
let sk: StreakrInstance | null = null;

onMounted(() => {
  if (el.value) sk = createStreakr({ target: el.value, years: props.years, getDays: props.getDays });
});
onBeforeUnmount(() => sk?.destroy());
</script>

<template>
  <div ref="el" />
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { createStreakr, type StreakrDay, type StreakrInstance } from "@rosado-io/streakr";
  import "@rosado-io/streakr/styles.css";

  export let years: number[];
  export let getDays: (year: number) => StreakrDay[];

  let el: HTMLElement;
  let sk: StreakrInstance | null = null;

  onMount(() => { sk = createStreakr({ target: el, years, getDays }); });
  onDestroy(() => sk?.destroy());
</script>

<div bind:this={el}></div>
```

## Bringing in real data

Streakr ships data utilities for fetching from Git hosts and shaping the
result for the component.

### Providers

```ts
import { GitHubProvider, GitLabProvider, aggregate } from "@rosado-io/streakr";

const events = await aggregate(
  [
    new GitHubProvider({ token: process.env.GITHUB_TOKEN! }),
    new GitLabProvider({ token: process.env.GITLAB_TOKEN! }),
  ],
  { user: "octocat", start: "2026-01-01", end: "2026-12-31" },
);
```

`aggregate(providers, params)` returns a merged array; failed providers are
skipped. See [docs/providers.md](docs/providers.md) for authentication,
self-hosted GitLab, rate-limit notes, and writing your own provider.

### Utilities

- `normalizeEventsToDaily(events)` — merge duplicates, fill gaps, sort.
- `computeStreaks(days)` — total, best streak, current streak.
- `buildCalendarGrid(days, options?)` — week-by-day grid with intensity levels.

These are independent helpers — useful if you want to plug custom data into
`createStreakr` or build something different on top.

## Privacy

Streakr does not send data to any Streakr-owned service. Provider classes call
the configured Git host directly from the environment where your code runs.

Treat tokens as secrets:

- Don't expose GitHub or GitLab PATs in public browser code.
- Prefer server-side fetching or an authenticated backend proxy for real data.
- Cache provider responses to reduce API calls and rate-limit pressure.

## Development

```sh
pnpm install
pnpm dev      # runs the demo / landing
pnpm test
pnpm build
```

## License

MIT

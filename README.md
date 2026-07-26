# Streakr

[![npm version](https://badge.fury.io/js/@rosado-io%2Fstreakr.svg)](https://www.npmjs.com/package/@rosado-io/streakr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/rosado-io/streakr/actions/workflows/ci.yml/badge.svg)](https://github.com/rosado-io/streakr/actions/workflows/ci.yml)
[![Semantic Release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## What is Streakr?

Streakr is a framework-agnostic, drop-in contribution-calendar component. It
unifies activity from GitHub, GitLab, self-hosted GitLab, or your own providers
into one themeable heatmap with year tabs, provider toggles, loading/empty/ready
states, stats, and an interactive tooltip.

The package is written in vanilla TypeScript and ships without React, Vue, or
other runtime dependencies. Use the component directly from DOM code, wrap it in
your framework of choice, or use the provider utilities independently to fetch
and normalize contribution data.

## Installation

Install from npm:

```sh
npm install @rosado-io/streakr
# or
pnpm add @rosado-io/streakr
# or
yarn add @rosado-io/streakr
```

Or load the ESM build and CSS from a CDN. Pin the version in production:

```html
<div id="streakr"></div>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@rosado-io/streakr@1.1.2/dist/streakr.css"
/>
<script type="module">
  import { createStreakr } from "https://esm.sh/@rosado-io/streakr@1.1.2";

  createStreakr({
    target: document.getElementById("streakr"),
    years: [2026],
    getDays: () => [],
  });
</script>
```

## Quickstart

```html
<div id="streakr"></div>
```

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

The CSS file ships dark/light tokens, accent tinting, modal, tooltip, skeleton,
and responsive heatmap styles. You can override any token with your own CSS
variables (`--sk-*`).

## API

### `createStreakr(options): StreakrInstance`

| Option             | Type                              | Default                       | Description                                                       |
| ------------------ | --------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `target`           | `HTMLElement`                     | required                      | Where to mount the component.                                     |
| `theme`            | `"dark" \| "light" \| "system"`   | `"dark"`                      | Visual theme. `"system"` follows `prefers-color-scheme`.          |
| `accent`           | `string` (CSS color)              | `"#39d353"`                   | Drives chip/stat highlights and (optionally) the heatmap palette. |
| `tintHeatmap`      | `boolean`                         | `true`                        | When true, the heatmap palette is derived from `accent`.          |
| `showProviders`    | `boolean`                         | `true`                        | Toggle the provider chip row.                                     |
| `showStats`        | `boolean`                         | `true`                        | Toggle the stats grid.                                            |
| `state`            | `"loading" \| "empty" \| "ready"` | `"ready"`                     | Override the lifecycle state.                                     |
| `years`            | `number[]`                        | required                      | Years offered in the year tabs / picker.                          |
| `year`             | `number`                          | last `years` entry            | Currently selected year.                                          |
| `today`            | `Date`                            | `new Date()`                  | Reference date for the current-year year-to-date view.            |
| `getDays`          | `(year) => StreakrDay[]`          | required                      | Returns the days for a given year.                                |
| `providers`        | `StreakrProvider[]`               | `[github, gitlab, bitbucket]` | Visual provider chips and source keys (see below).                |
| `onYearChange`     | `(year) => void`                  | —                             | Fires after the user picks a different year.                      |
| `onProviderToggle` | `(key, enabled, all) => void`     | —                             | Fires after a provider chip is toggled.                           |

### `StreakrInstance`

| Method               | Description                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update(patch)`      | Patches any `StreakrOptions` value and re-renders. Undefined values are ignored. `target` cannot be updated after mount — call `destroy()` and recreate the instance with `createStreakr()` to move to a different element. |
| `setYear(year)`      | Changes the active year, fires `onYearChange`, and re-renders.                                                                                                                                                              |
| `setProviders(next)` | Patches provider enabled/disabled state by provider key.                                                                                                                                                                    |
| `destroy()`          | Removes DOM nodes, resize observers, tooltip, and keyboard listeners.                                                                                                                                                       |

> ⚠️ **`update({ target })` throws.** The component is mounted into `target` at
> creation time and the root node is not moved afterwards. Calling
> `update({ target })` throws
> `Cannot update 'target' after mount. Destroy and recreate the instance.`
> To change the mount point, destroy the current instance and create a new one.

### `StreakrDay`

```ts
interface StreakrDay {
  date: Date;
  total: number; // sum across all providers
  sources?: Record<string, number>; // keyed by `StreakrProvider.key`
}
```

When `sources` is present, the component recomputes `total` based on which
providers are toggled on, so the value you pass in should be the "all providers"
total. When `sources` is omitted, `total` is rendered as-is and provider toggles
cannot split that day by source.

### `StreakrProvider`

```ts
interface StreakrProvider {
  key: string; // matches a key in StreakrDay.sources
  name: string; // display label
  color: string; // dot/accent color in chips and tooltip
  icon?: string; // optional inline SVG (built-in for github, gitlab, bitbucket)
}
```

## Custom providers

Built-in display icons cover GitHub, GitLab, and Bitbucket. These are visual
providers: they control chip labels, icons, colors, and which `sources` keys the
component can toggle. Data-fetching providers currently ship for GitHub and
GitLab only; there is no built-in `BitbucketProvider` fetcher.

For other sources, pass your own `providers` array and return matching `sources`
keys from `getDays`:

```ts
createStreakr({
  target: el,
  years: [2026],
  providers: [
    { key: "gitea", name: "Gitea", color: "#609926" },
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

### Agent providers preset

For coding-agent activity, `AGENT_PROVIDERS` ships chips for Claude, Codex,
opencode, and Copilot with distinct colors and built-in icons (Codex has no
icon and falls back to its color dot). Agents are opt-in — the default stays
git hosts — so spread both presets together:

```ts
import { createStreakr, DEFAULT_PROVIDERS, AGENT_PROVIDERS } from "@rosado-io/streakr";

createStreakr({
  target: el,
  years: [2026],
  providers: [...DEFAULT_PROVIDERS, ...AGENT_PROVIDERS],
  getDays: (year) => myFetchActivity(year), // days like { sources: { github: 2, claude: 3, codex: 1 } }
});
```

Provider chips are independent on/off toggles and every provider starts enabled.
Clicking Claude disables or re-enables Claude; to show only Claude, disable the
other providers or call `setProviders()` with their keys set to `false`.

Agent co-authored commits are usually already included in the GitHub total, so
adding both raw counts would double-count them and make the GitHub chip overlap
the agent chips. Partition the host total from the agent attributions with
`splitCoAuthored()` first; see
[Composing with the rest of Streakr](docs/agents.md#composing-with-the-rest-of-streakr).

## Lifecycle states

```ts
sk.update({ state: "loading" }); // shimmer skeleton
sk.update({ state: "empty" }); // empty illustration with the active year
sk.update({ state: "ready" }); // normal render
```

`"ready"` with a year that has zero contributions automatically falls back to
the empty illustration.

## Responsive layout and ring interaction

The component renders a 53-week heatmap when the container is 520px or wider, and
switches to a radial year ring below that breakpoint. Both layouts share the same
year, provider, and state configuration.

### Ring gestures

The ring is interactive on pointer devices and touch screens:

- **Tap a ray** to select that day. The center updates to show the date and
total, and the hand rotates to point at the selection.
- **Drag around the ring** to scrub through the year. The hand follows the
pointer while it stays inside the ring, and the center updates for each day the
pointer crosses.
- **Release** to finish the gesture on the last day under the pointer.
- **Tap the center** (or click it with a mouse) to reset the selection back to
today.

The ring distinguishes drags from clicks: a small drag suppresses the click
handler for that gesture so tapping a single day still works reliably after a
swipe.

### Keyboard access

Each day ray is focusable and behaves like a button:

- `Tab` moves focus to the currently selected ray.
- `Enter` or `Space` selects the focused ray and updates the center.
- `ArrowRight` / `ArrowDown` move focus to the next day.
- `ArrowLeft` / `ArrowUp` move focus to the previous day.
- `Home` moves focus to the first day of the year.
- `End` moves focus to the last day of the year.

The year button, provider chips, and year-modal list are also keyboard
operable.

## Framework snippets

The component is vanilla DOM. These snippets show the lifecycle wrapper only.

### Vanilla

```ts
import { createStreakr } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const el = document.querySelector<HTMLElement>("#streakr");
if (!el) throw new Error("Missing #streakr");

const sk = createStreakr({
  target: el,
  years: [2026],
  getDays: (year) => loadDays(year),
});

window.addEventListener("beforeunload", () => sk.destroy(), { once: true });
```

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
  if (el.value)
    sk = createStreakr({ target: el.value, years: props.years, getDays: props.getDays });
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
import {
  githubProvider,
  gitlabProvider,
  aggregate,
  normalizeEventsToDaily,
} from "@rosado-io/streakr";

const events = await aggregate(
  [
    githubProvider({ token: process.env.GITHUB_TOKEN! }),
    gitlabProvider({ token: process.env.GITLAB_TOKEN! }),
  ],
  { user: "octocat", start: "2026-01-01", end: "2026-12-31" },
);

const days = normalizeEventsToDaily(events).map((day) => ({
  date: new Date(`${day.date}T00:00:00`),
  total: day.count,
  sources: day.sources,
}));
```

`aggregate(providers, params)` fetches providers concurrently, tags each returned
day in `sources`, and skips failed providers. Call `normalizeEventsToDaily()` to
merge same-date entries into one daily series. See [docs/providers.md](docs/providers.md)
for authentication, self-hosted GitLab, rate-limit notes, and writing your own
provider.

### Agent records

For coding-agent activity, two providers count `Co-authored-by:` trailers and
return the same daily series keyed per agent (Claude, Codex, opencode, Copilot):
`githubCoAuthorProvider` reads the GitHub commit search API, and
`localGitCoAuthorProvider` (`@rosado-io/streakr/agents`, Node-only) scans local
clones across GitHub, GitLab, and self-hosted origins. Published default branches
are the safe default; all remote or local refs are opt-in. `githubCliProvider`
and `gitlabCliProvider` can reuse local CLI sessions without accepting tokens,
and the snapshot helper publishes only sanitized counts. Trailers count shipped
commits, not agent usage, so the numbers are a lower bound. See
[docs/agents.md](docs/agents.md) for semantics, configuration, and privacy.

### Utilities

`normalizeEventsToDaily(events)` accepts `ContributionDay[]` with `YYYY-MM-DD`
date strings. It merges duplicate dates, sums their `count` values, merges
matching `sources`, sorts by date, and fills missing days between the earliest
and latest event with zero-count entries.

`computeStreaks(days)` accepts a contiguous daily `ContributionDay[]` series,
sorted in the order you want to evaluate. Fill missing calendar dates with
zero-count entries first, for example with `normalizeEventsToDaily`; sparse
positive dates across a gap are otherwise treated as adjacent entries. The
helper returns `total`, `bestStreak`, and `currentStreak`, where a streak is any
consecutive run of entries with `count > 0`.

`buildCalendarGrid(days, options?)` creates a week-by-day grid for custom UIs.
`options.startDate` and `options.endDate` constrain the inclusive date range;
when omitted, the first and last input dates are used. `options.weekStartsOn`
defaults to `0` (Sunday) and also accepts `1` (Monday). Each rendered cell gets a
`level` from `0` to `4` based on contribution intensity.

`toCanonicalDays(days, start, end)` is like `normalizeEventsToDaily`, but it
anchors the output to a fixed inclusive date range. It is useful when a provider
returns sparse events and you want the series to cover the full requested window.

These are independent helpers — useful if you want to plug custom data into
`createStreakr` or build something different on top.

### Package exports

```ts
import {
  createStreakr,
  DEFAULT_PROVIDERS,
  AGENT_PROVIDERS,
  githubProvider,
  gitlabProvider,
  githubCoAuthorProvider,
  aggregate,
  normalizeEventsToDaily,
  toCanonicalDays,
  computeStreaks,
  buildCalendarGrid,
  splitCoAuthored,
} from "@rosado-io/streakr";
```

## Privacy

Streakr does not send data to any Streakr-owned service and does not include
analytics, cookies, or background network calls. The component renders whatever
`getDays` returns into the DOM. Providers call the configured Git host
directly from the environment where your code runs.

Treat tokens as secrets:

- Don't expose GitHub or GitLab PATs in public browser code.
- Prefer server-side fetching or an authenticated backend proxy for real data.
- Cache provider responses to reduce API calls and rate-limit pressure.
- Contribution counts can reveal work patterns. Aggregate, redact, or limit
  ranges before showing private activity on public pages.
- Custom provider icons are inserted as raw SVG HTML; only use trusted static
  markup or sanitize it first.

## Versioning

Streakr follows [semver](https://semver.org/). Releases from 1.0 onward treat
major versions as breaking, minors as backward-compatible features, and patches
as backward-compatible fixes.

Pin to a version that matches your risk tolerance:

```sh
npm install @rosado-io/streakr@^1.1.2
# or
pnpm add @rosado-io/streakr@^1.1.2
```

## Development

```sh
pnpm install
pnpm dev             # runs the demo / landing
pnpm test            # vitest in watch mode
pnpm test:ci         # single run with coverage
pnpm lint
pnpm typecheck
pnpm format:check
pnpm audit:dead-code
pnpm build
```

## License

MIT

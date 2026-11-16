# Streakr

[![npm version](https://badge.fury.io/js/@rosado-io%2Fstreakr.svg)](https://www.npmjs.com/package/@rosado-io/streakr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/rosado-io/streakr/actions/workflows/ci.yml/badge.svg)](https://github.com/rosado-io/streakr/actions/workflows/ci.yml)

Streakr is a framework-agnostic presentation layer for contribution and activity
calendars. You own data acquisition, credentials, caching, and persistence.
Streakr receives one serializable contract and renders a responsive heatmap,
mobile ring, source filters, year navigation, lifecycle states, and statistics.

```text
your API / database / file / build script
                    ↓
              StreakrDay[]
                    ↓
       heatmap · ring · filters · stats
```

The package contains no network clients, token handling, filesystem access, or
runtime dependencies. Streakr is published as ESM.

## Installation

```sh
npm install @rosado-io/streakr
# pnpm add @rosado-io/streakr
# yarn add @rosado-io/streakr
```

## Quickstart

```html
<div id="streakr"></div>
```

```ts
import { createStreakr } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const streakr = createStreakr({
  target: document.querySelector<HTMLElement>("#streakr")!,
  years: [2025, 2026],
  year: 2026,
  days: [
    {
      date: "2026-07-28",
      count: 7,
      sources: { work: 5, personal: 2 },
    },
  ],
  sources: [
    { key: "work", name: "Work", color: "#39d353" },
    { key: "personal", name: "Personal", color: "#4f8cff" },
  ],
  onYearChange(year) {
    void loadYear(year);
  },
});

let requestId = 0;

async function loadYear(year: number) {
  const currentRequest = ++requestId;
  streakr.update({ year, status: "loading" });
  try {
    const response = await fetch(`/api/activity?year=${year}`);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const days = await response.json();
    if (currentRequest !== requestId) return;
    streakr.update({ days, status: "ready" });
  } catch {
    if (currentRequest !== requestId) return;
    streakr.update({
      status: "error",
      errorMessage: "Activity could not be loaded.",
    });
  }
}
```

Pass multiple years in one `days` array when they are already available.
Streakr selects the requested year without calling application code.

## Data contract

```ts
interface StreakrDay {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
  readonly sources?: Readonly<Record<string, number>>;
}
```

Streakr validates its inputs before rendering:

- Dates must be real calendar dates in `YYYY-MM-DD` form.
- Counts must be non-negative safe integers.
- Dates and source keys must be unique.
- Every source key in a day must be declared in `sources`.
- When `sources` is present, its values must add up to `count`.
- `year` must appear in `years`.

String dates prevent UTC parsing from shifting a contribution into an adjacent
local day.

## API

### `createStreakr(options)`

| Option           | Type                                  | Default       | Purpose                                  |
| ---------------- | ------------------------------------- | ------------- | ---------------------------------------- |
| `target`         | `HTMLElement`                         | required      | Element that receives the component.     |
| `days`           | `readonly StreakrDay[]`               | required      | Serializable activity data to present.   |
| `years`          | `readonly number[]`                   | required      | Available year tabs.                     |
| `year`           | `number`                              | last year     | Selected year.                           |
| `today`          | `string`                              | current date  | `YYYY-MM-DD` reference for year-to-date. |
| `status`         | `loading \| empty \| ready \| error`  | `ready`       | Presentation lifecycle state.            |
| `errorMessage`   | `string`                              | built-in copy | Message rendered by the error state.     |
| `sources`        | `readonly StreakrSource[]`            | host presets  | Labels, colors, icons, and filter keys.  |
| `theme`          | `dark \| light \| system`             | `dark`        | Visual theme.                            |
| `accent`         | six-digit hex color                   | `#39d353`     | Accent and optional heatmap tint.        |
| `tintHeatmap`    | `boolean`                             | `true`        | Derive heat levels from the accent.      |
| `showSources`    | `boolean`                             | `true`        | Show source filter chips when useful.    |
| `showStats`      | `boolean`                             | `true`        | Show computed records.                   |
| `onDaySelect`    | `(day: StreakrDay) => void`           | —             | Observe a user-selected day with filtered counts. |
| `onYearChange`   | `(year) => void`                      | —             | Observe a user-selected year.            |
| `onSourceToggle` | `(key, enabled, sourceState) => void` | —             | Observe source filter changes.           |

The instance exposes:

```ts
streakr.update({ days, status: "ready" });
streakr.setYear(2025);
streakr.setSources({ work: false });
streakr.destroy();
```

`target` is intentionally absent from `update()`. Destroy and recreate an
instance to move it.

### Explore a day

```ts
createStreakr({
  target,
  years,
  days,
  onDaySelect(day) {
    // Your application owns the detail panel and any data fetching.
    detail.textContent = `${day.date}: ${day.count} contributions`;
    // Use day.date to look up commits, sessions, or other activities.
  },
});
```

Click a heatmap cell or ring day, use Enter/Space or arrow keys, or drag the ring
and release. The selected day stays highlighted across updates and responsive
view changes. Changing year selects today in the current year, or January 1 in
other years. Future days in the current year cannot be selected.

`onDaySelect` receives a fresh `StreakrDay`: `count` and `sources` include only
enabled sources. Total-only input days still omit `sources`; missing days have
zero counts. Mutating the payload does not modify the component's data.
Mounting, resizing, changing filters, and calling `update()` do not emit the
event. A ring drag previews days locally and emits once on release; cancellation
does not emit. Clear or refresh application-owned details when filters or the
year change. Replace the handler with `update({ onDaySelect })`, or remove it
with `update({ onDaySelect: null })`.

The live demo includes an application-owned day panel. See the
[day-detail recipe](docs/recipes/day-detail.md) for asynchronous details with
stale-response protection.

### Visual sources

`DEFAULT_SOURCES` contains GitHub, GitLab, and Bitbucket presentation presets.
`AGENT_SOURCES` contains Claude, Codex, opencode, Copilot, Kimi, and Antigravity presets. They do
not fetch or classify data.

```ts
import { AGENT_SOURCES, DEFAULT_SOURCES, createStreakr } from "@rosado-io/streakr";

createStreakr({
  target,
  years,
  days,
  sources: [...DEFAULT_SOURCES, ...AGENT_SOURCES],
});
```

A custom icon is a factory returning an SVG node, so Streakr never inserts
consumer-provided HTML:

```ts
const source = {
  key: "work",
  name: "Work",
  color: "#39d353",
  icon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    return svg;
  },
};
```

## Recipes

Recipes are application-owned examples, not runtime exports:

- [Recipe index](docs/recipes/README.md)
- [GitHub public calendar](docs/recipes/github.md)
- [Custom API with loading and errors](docs/recipes/custom-api.md)
- [Local Git snapshot](docs/recipes/local-git.md)
- [Merge several sources](docs/recipes/multiple-sources.md)

Copy a recipe, adapt it, or ignore it and produce the contract however you want.
Keep credentials in a server, CI job, or local build process—not in browser
code.

## Responsive and accessible interaction

Containers at least 520px wide render a weekly heatmap. Smaller containers use
the radial ring. Both views are keyboard accessible:

- Year and source controls use native buttons and expose their active state.
- Heatmap days use one roving tab stop and arrow-key navigation.
- Ring days support arrows, Home, End, Enter, and Space.
- Loading, empty, and error states have accessible announcements.
- Motion respects `prefers-reduced-motion`.

### Future days

In the current year, days after `today` are future days. The ring draws them
transparent and non-interactive; the heatmap keeps them visible and focusable
with a "No contributions" label and `aria-disabled="true"` so keyboard navigation covers a uniform grid. They do not emit selection events.

## Styling

Import `@rosado-io/streakr/styles.css`. Override `--sk-*` custom properties on
`.sk-root` for deeper customization. The package has no external CSS
dependencies.

## Development

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test:ci
pnpm build
pnpm build:demo
pnpm audit:dead-code
pnpm check:package
```

## License

MIT

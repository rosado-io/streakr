import type {
  StreakrDay,
  StreakrInstance,
  StreakrLeveledDay,
  StreakrOptions,
  StreakrProvider,
  StreakrProviders,
  StreakrThemeMode,
} from "../types";
import { DAY_LABELS, fmtDateLong, gridFromDays, monthHeaders, padDaysToYear } from "./calendar";
import { h, svg, trustedHtml } from "./dom";
import { logoR } from "./logo";
import { computeStats, formatTotalLabel, levelize, type StreakrStats } from "./metrics";
import {
  DEFAULT_PROVIDERS,
  enabledProviderState,
  providerIconHtml,
  syncProviderState as syncProviders,
} from "./providers";

const MAX_VISIBLE_YEARS = 5;

interface InternalState {
  year: number | null;
  providers: StreakrProviders;
  yearModalOpen: boolean;
}

interface ResolvedConfig {
  target: HTMLElement;
  theme: StreakrThemeMode;
  accent: string;
  tintHeatmap: boolean;
  showProviders: boolean;
  showStats: boolean;
  state: "loading" | "empty" | "ready";
  years: number[];
  year: number | null;
  getDays: (year: number) => StreakrDay[];
  providers: StreakrProvider[];
  onYearChange: ((year: number) => void) | null;
  onProviderToggle: ((key: string, enabled: boolean, providers: StreakrProviders) => void) | null;
}

function dayCount(day: StreakrDay, key: string): number {
  return day.sources?.[key] ?? 0;
}

/**
 * Creates a stateful Streakr component instance.
 *
 * Mounts a contribution heatmap inside `target`, with year tabs, configurable
 * provider toggles, loading/empty/ready states, an interactive tooltip, and
 * a year picker modal. Returns an object with `update`, `setYear`,
 * `setProviders`, and `destroy` methods.
 *
 * The component is framework-agnostic and uses no global state — it only
 * reads/writes inside the provided `target` element. The tooltip is mounted
 * inside `.sk-root` so it inherits the component's theme tokens and any
 * accent overrides applied via `update()`.
 *
 * @param options - Component mount target, data source, visual settings, and callbacks.
 * @returns A `StreakrInstance` for updating or destroying the component.
 * @throws Error when `options.target` is missing.
 */
export function createStreakr(options: StreakrOptions): StreakrInstance {
  const cfg: ResolvedConfig = {
    target: options.target,
    theme: options.theme ?? "dark",
    accent: options.accent ?? "#39d353",
    tintHeatmap: options.tintHeatmap ?? true,
    showProviders: options.showProviders ?? true,
    showStats: options.showStats ?? true,
    state: options.state ?? "ready",
    years: options.years ?? [],
    year: options.year ?? null,
    getDays: options.getDays ?? (() => []),
    providers: options.providers ?? DEFAULT_PROVIDERS,
    onYearChange: options.onYearChange ?? null,
    onProviderToggle: options.onProviderToggle ?? null,
  };

  if (!cfg.target) throw new Error("streakr: `target` is required");
  if (cfg.year == null && cfg.years.length) {
    cfg.year = cfg.years[cfg.years.length - 1];
  }

  const state: InternalState = {
    year: cfg.year,
    providers: enabledProviderState(cfg.providers),
    yearModalOpen: false,
  };

  function syncProviderState(): void {
    state.providers = syncProviders(cfg.providers, state.providers);
  }

  const root = h("div", { class: "sk-root" }) as HTMLElement;
  cfg.target.appendChild(root);
  // Mount the tooltip inside `.sk-root` so it inherits the component's
  // scoped CSS tokens (--sk-modal-bg, --sk-text, etc.). It still uses
  // `position: fixed` so it positions against the viewport.
  const tooltipEl = h("div", { class: "sk-tooltip" }) as HTMLElement;
  root.appendChild(tooltipEl);
  let currentDraw: (() => void) | null = null;
  const resizeObs = new ResizeObserver(() => currentDraw?.());

  let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  function getActiveTheme(): "dark" | "light" {
    if (cfg.theme === "system") {
      if (globalThis.window?.matchMedia) {
        return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "dark";
    }
    return cfg.theme;
  }

  function setupThemeListener(): void {
    if (!globalThis.window?.matchMedia) return;

    cleanupThemeListener();

    if (cfg.theme === "system") {
      const mediaQuery = globalThis.window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (e: MediaQueryListEvent) => {
        root.dataset.theme = e.matches ? "dark" : "light";
      };
      mediaQuery.addEventListener("change", mediaQueryListener);
    }
  }

  function cleanupThemeListener(): void {
    if (mediaQueryListener && globalThis.window?.matchMedia) {
      const mediaQuery = globalThis.window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.removeEventListener("change", mediaQueryListener);
      mediaQueryListener = null;
    }
  }

  function applyAccentVars(el: HTMLElement): void {
    const a = cfg.accent;
    el.style.setProperty("--sk-accent", a);
    el.style.setProperty("--sk-accent-glow", a + "47");
    el.style.setProperty("--sk-accent-soft", a + "0d");
    el.style.setProperty("--sk-accent-mid", a + "8c");
    el.style.setProperty("--sk-accent-bg", a + "1a");
    if (cfg.tintHeatmap) {
      el.style.setProperty("--sk-heat-1", `color-mix(in oklab, ${a} 18%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-2", `color-mix(in oklab, ${a} 45%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-3", `color-mix(in oklab, ${a} 75%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-4", a);
    } else {
      ["--sk-heat-1", "--sk-heat-2", "--sk-heat-3", "--sk-heat-4"].forEach((v) =>
        el.style.removeProperty(v),
      );
    }
  }

  function visibleYears(): { visible: number[]; all: number[]; hasMore: boolean } {
    const all = cfg.years.slice().reverse();
    return {
      visible: all.slice(0, MAX_VISIBLE_YEARS),
      all,
      hasMore: all.length > MAX_VISIBLE_YEARS,
    };
  }

  function getCurrentDays(): StreakrDay[] {
    if (cfg.state !== "ready" || state.year == null) return [];
    const raw = cfg.getDays(state.year) || [];
    return raw.map((day) => ({
      ...day,
      total: cfg.providers
        .filter((provider) => state.providers[provider.key])
        .reduce((total, provider) => total + dayCount(day, provider.key), 0),
    }));
  }

  function showTooltip(e: MouseEvent, day: StreakrDay): void {
    tooltipEl.replaceChildren();
    tooltipEl.appendChild(h("div", { class: "tt-date", text: fmtDateLong(day.date) }));
    const totalLabel = formatTotalLabel(day.total);
    tooltipEl.appendChild(h("div", { class: "tt-total", text: totalLabel }));
    cfg.providers
      .filter((provider) => state.providers[provider.key])
      .map((provider) => ({ provider, value: dayCount(day, provider.key) }))
      .filter(({ value }) => value > 0)
      .forEach(({ provider, value }) => {
        tooltipEl.appendChild(
          h("div", { class: "tt-row" }, [
            h("span", { class: "tt-label" }, [
              h("span", { class: "dot", style: { background: provider.color } }),
              provider.name,
            ]),
            h("span", { class: "tt-val", text: String(value) }),
          ]),
        );
      });
    tooltipEl.style.left = e.clientX + 14 + "px";
    tooltipEl.style.top = e.clientY + 14 + "px";
    tooltipEl.classList.add("visible");
  }

  function moveTooltip(e: MouseEvent): void {
    tooltipEl.style.left = e.clientX + 14 + "px";
    tooltipEl.style.top = e.clientY + 14 + "px";
  }

  function hideTooltip(): void {
    tooltipEl.classList.remove("visible");
  }

  function bindCellEvents(rect: SVGElement, day: StreakrDay): void {
    rect.addEventListener("mouseenter", (e) => showTooltip(e, day));
    rect.addEventListener("mousemove", (e) => moveTooltip(e));
    rect.addEventListener("mouseleave", hideTooltip);
  }

  function buildHeatmapCell(
    day: StreakrLeveledDay | null,
    ri: number,
    sq: number,
    colStep: number,
  ): SVGElement {
    const rect = svg("rect", {
      class: day ? "sk-heatmap-cell" : null,
      y: ri * colStep,
      width: sq,
      height: sq,
      rx: Math.max(2, sq * 0.22),
      fill: day ? `var(--sk-heat-${day.level})` : "transparent",
      style: { cursor: day ? "pointer" : "default" },
    });
    if (day) bindCellEvents(rect, day);
    return rect;
  }

  function buildHeatmapColumn(
    col: (StreakrLeveledDay | null)[],
    ci: number,
    sq: number,
    colStep: number,
  ): SVGElement {
    const colG = svg("g", { transform: `translate(${ci * colStep}, 0)` });
    col.forEach((day, ri) => {
      colG.appendChild(buildHeatmapCell(day, ri, sq, colStep));
    });
    return colG;
  }

  function renderHeatmap(wrap: HTMLElement, days: StreakrLeveledDay[], containerW: number): void {
    const cols = gridFromDays(days);
    const headers = monthHeaders(cols);
    const labelsW = 28;
    const trailingW = 8;
    const gridW = Math.max(
      0,
      (containerW || wrap.getBoundingClientRect().width || 820) - labelsW - trailingW,
    );
    const targetGap = 3;
    const rawSq = gridW / Math.max(1, cols.length) - targetGap;
    const sq = Math.max(9, Math.min(11, rawSq));
    const gap = Math.max(2, Math.min(3, Math.round(sq * 0.25)));
    const colStep = sq + gap;
    const H = 7 * colStep + 24;
    const W = labelsW + cols.length * colStep + trailingW;
    const fontSize = Math.max(9, Math.min(11, sq * 0.82));

    const svgEl = svg("svg", {
      class: "sk-heatmap-svg",
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
    });

    headers.forEach((hd) => {
      svgEl.appendChild(
        svg(
          "text",
          {
            x: labelsW + hd.col * colStep,
            y: 10,
            fill: "var(--sk-text-muted)",
            "font-size": fontSize,
            "font-family": "'Geist', sans-serif",
          },
          hd.label,
        ),
      );
    });

    [1, 3, 5].forEach((d, i) => {
      svgEl.appendChild(
        svg(
          "text",
          {
            x: 0,
            y: 24 + d * colStep + sq - 2,
            fill: "var(--sk-text-subtle)",
            "font-size": Math.max(8.5, fontSize - 1),
            "font-family": "'Geist', sans-serif",
          },
          DAY_LABELS[i],
        ),
      );
    });

    const g = svg("g", { transform: `translate(${labelsW}, 18)` });
    cols.forEach((col, ci) => {
      g.appendChild(buildHeatmapColumn(col, ci, sq, colStep));
    });
    svgEl.appendChild(g);

    const inner = h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]);
    wrap.replaceChildren(inner);
  }

  type ReadyBody = HTMLElement & {
    __skDraw?: () => void;
    __skObserveTarget?: HTMLElement;
  };

  interface RenderFlags {
    isLoading: boolean;
    isEmpty: boolean;
    allOff: boolean;
    days: StreakrDay[];
    providersWithDataCount: number;
    leveled: StreakrLeveledDay[];
    stats: StreakrStats;
  }

  function computeRenderFlags(): RenderFlags {
    const days = getCurrentDays();
    const stats = computeStats(days);
    const yearTotal = days.reduce((a, d) => a + d.total, 0);
    // Pad to a full Jan–Dec span so the heatmap keeps a uniform column count
    // year-over-year (e.g. the in-progress current year doesn't shrink). Stats
    // stay computed from `days` so the trailing zero pad doesn't reset
    // "Current Streak".
    const heatmapDays = state.year == null ? days : padDaysToYear(days, state.year);
    const leveled = levelize(heatmapDays);
    const isLoading = cfg.state === "loading";
    const isEmpty = cfg.state === "empty" || (cfg.state === "ready" && yearTotal === 0);
    const allOff = cfg.providers.length > 0 && cfg.providers.every((p) => !state.providers[p.key]);
    const providersWithDataCount =
      cfg.state === "ready"
        ? cfg.providers.filter((p) => days.some((d) => dayCount(d, p.key) > 0)).length
        : 0;
    return { isLoading, isEmpty, allOff, days, providersWithDataCount, leveled, stats };
  }

  function renderTitleRow(): HTMLElement {
    const subtitleText =
      state.year === currentYearLabel() ? "Last 12 months" : String(state.year ?? "");
    return h("div", { class: "sk-title-row" }, [
      h("div", { class: "sk-brand" }, [
        h("div", { class: "sk-logo" }, [logoR()]),
        h("div", { class: "sk-title", text: "streakr" }),
        h("div", { class: "sk-subtitle", text: subtitleText }),
      ]),
    ]);
  }

  function buildYearTab(year: number, isLoading: boolean): HTMLElement {
    return h("button", {
      class: "sk-year-tab" + (state.year === year ? " active" : ""),
      onclick: () => setYear(year),
      disabled: isLoading || undefined,
      text: String(year),
    });
  }

  function renderYearsList(isLoading: boolean): HTMLElement {
    const { visible, hasMore } = visibleYears();
    const yearIsHidden = state.year != null && !visible.includes(state.year);
    const list = h("div", { class: "sk-years-list" });
    visible.forEach((y) => list.appendChild(buildYearTab(y, isLoading)));
    if (yearIsHidden && state.year != null) {
      list.appendChild(
        h("button", {
          class: "sk-year-tab active",
          onclick: () => openYearModal(),
          text: String(state.year),
        }),
      );
    }
    if (hasMore) {
      list.appendChild(
        h(
          "button",
          {
            class: "sk-year-more",
            "aria-label": "More years",
            onclick: () => openYearModal(),
          },
          [h("span"), h("span"), h("span")],
        ),
      );
    }
    return list;
  }

  function shouldRenderProviderRow(flags: RenderFlags): boolean {
    // Hide the toggle row when ≤1 provider has any contributions for the
    // current year — clicking the only active chip would otherwise wipe the
    // calendar and look broken (see issue #84).
    return (
      !flags.isLoading &&
      !flags.isEmpty &&
      cfg.showProviders &&
      cfg.providers.length > 0 &&
      flags.providersWithDataCount > 1
    );
  }

  function renderYearsBar(flags: RenderFlags): HTMLElement {
    const yearsBar = h("div", { class: "sk-years" });
    yearsBar.dataset.noProviders = String(!cfg.showProviders);
    yearsBar.appendChild(renderYearsList(flags.isLoading));
    if (shouldRenderProviderRow(flags)) {
      yearsBar.appendChild(renderProviderRow());
    }
    return yearsBar;
  }

  function renderHeader(flags: RenderFlags): HTMLElement {
    const header = h("div", { class: "sk-header" });
    header.appendChild(renderTitleRow());
    header.appendChild(renderYearsBar(flags));
    return header;
  }

  function appendBody(card: Element, flags: RenderFlags): void {
    const stateBody = [
      [flags.isLoading, renderLoadingBody],
      // Check `allOff` before `isEmpty` so users who explicitly toggled every
      // provider off see "providers disabled" guidance instead of the
      // (technically true but misleading) "no contributions" empty state.
      [flags.allOff, renderNoProviders],
      [flags.isEmpty, renderEmpty],
    ].find(([matches]) => matches) as [boolean, () => HTMLElement] | undefined;

    if (stateBody) {
      card.appendChild(stateBody[1]());
      return;
    }

    const body = renderReadyBody(flags.leveled, flags.stats, flags.days) as ReadyBody;
    card.appendChild(body);
    body.__skDraw?.();
    if (body.__skObserveTarget) resizeObs.observe(body.__skObserveTarget);
  }

  function render(): void {
    syncProviderState();
    // Hide any tooltip pinned by a hovered cell that is about to be replaced
    // when we replace the root contents below — the cell's mouseleave never fires.
    hideTooltip();
    // Drop the previous heatmap wrap from the observer (the new render will
    // re-observe the freshly mounted wrap, if any).
    resizeObs.disconnect();
    currentDraw = null;

    const wasOpen = state.yearModalOpen;
    const flags = computeRenderFlags();

    // Re-attach the tooltip first. The element reference is preserved so
    // listeners and pending hover state stay intact across renders.
    root.replaceChildren(tooltipEl);
    root.dataset.theme = getActiveTheme();
    applyAccentVars(root);

    const card = h("div", { class: "sk-card" });
    root.appendChild(card);
    card.appendChild(renderHeader(flags));
    appendBody(card, flags);

    if (wasOpen) renderYearModal(card);
  }

  function renderProviderRow(): HTMLElement {
    const row = h("div", { class: "sk-providers" });
    const totals = computeProviderTotals();
    cfg.providers.forEach((p) => {
      const active = !!state.providers[p.key];
      const iconHtml = providerIconHtml(p);
      const btn = h(
        "button",
        {
          class: "sk-provider" + (active ? " active" : ""),
          title: p.name + " — " + totals[p.key].toLocaleString(),
          onclick: () => toggleProvider(p.key),
        },
        [
          h("span", {
            class: "sk-provider-icon",
            html: iconHtml ? trustedHtml(iconHtml) : undefined,
            style: iconHtml ? undefined : { background: p.color, borderRadius: "50%" },
          }),
          h("span", { class: "sk-provider-count", text: totals[p.key].toLocaleString() }),
        ],
      );
      row.appendChild(btn);
    });
    return row;
  }

  function computeProviderTotals(): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const p of cfg.providers) totals[p.key] = 0;
    if (cfg.state !== "ready" || state.year == null) return totals;
    const raw = cfg.getDays(state.year) || [];
    for (const d of raw) {
      for (const p of cfg.providers) {
        totals[p.key] += dayCount(d, p.key);
      }
    }
    return totals;
  }

  function renderLoadingBody(): HTMLElement {
    const grid = h("div", { class: "sk-skel-grid-cells" });
    for (let i = 0; i < 53 * 7; i++) {
      // Deterministic ~40% "on" pattern via Knuth's multiplicative hash —
      // not for security, just for a non-uniform shimmer that stays stable
      // across re-renders (avoids the flicker a real PRNG would cause).
      const on = ((i * 2654435761) >>> 0) % 100 < 40;
      grid.appendChild(
        h("div", {
          class: "sk-skel-cell" + (on ? " shimmer" : ""),
          style: { animationDelay: (i % 53) * 30 + "ms" },
        }),
      );
    }
    const skel = (w: number, hpx: number) =>
      h("div", {
        class: "sk-skeleton",
        style: { width: w + "px", height: hpx + "px", marginBottom: "10px" },
      });
    const stat = () => h("div", { class: "sk-stat" }, [skel(90, 11), skel(60, 26)]);
    return h("div", { class: "sk-body" }, [
      h("div", { class: "sk-heatmap-wrap" }, [
        grid,
        h("div", { class: "sk-legend" }, [
          h("span", { style: { opacity: ".4" }, text: "Loading..." }),
        ]),
      ]),
      h("div", { class: "sk-stats" }, [stat(), stat(), stat(), stat()]),
    ]);
  }

  function renderEmpty(): HTMLElement {
    return h("div", { class: "sk-empty" }, [
      h("div", {
        class: "sk-empty-icon",
        html: trustedHtml(
          '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<rect x="3" y="5" width="16" height="14" rx="2"/><path d="M3 9 H19"/>' +
            '<path d="M8 3 V7 M14 3 V7" stroke-linecap="round"/></svg>',
        ),
      }),
      h("div", {
        class: "sk-empty-title",
        text:
          "No contributions in " +
          (state.year === currentYearLabel() ? "the last 12 months" : String(state.year ?? "")),
      }),
      h("div", {
        class: "sk-empty-sub",
        text: "When you commit, push, or open PRs across your connected accounts, they'll show up here.",
      }),
    ]);
  }

  function renderNoProviders(): HTMLElement {
    return h("div", { class: "sk-noprov" }, [
      h("span", { class: "sk-noprov-dot" }),
      h("div", {
        style: { flex: "1" },
        text: "All providers are disabled — toggle one above to see contributions.",
      }),
      h("button", {
        class: "sk-year-tab",
        onclick: () => enableAllProviders(),
        text: "Enable all",
      }),
    ]);
  }

  function renderReadyBody(
    leveled: StreakrLeveledDay[],
    stats: StreakrStats,
    days: StreakrDay[],
  ): HTMLElement {
    const body = h("div", { class: "sk-body" }) as ReadyBody;
    body.dataset.noStats = String(!cfg.showStats);

    const heatmapWrap = h("div", { class: "sk-heatmap-wrap" });
    const heatmapInner = h("div");
    heatmapWrap.appendChild(heatmapInner);
    const legend = h("div", { class: "sk-legend" }, [
      h("span", { text: "Less" }),
      ...[0, 1, 2, 3, 4].map((i) =>
        h("span", { class: "sk-legend-sq", style: { background: `var(--sk-heat-${i})` } }),
      ),
      h("span", { text: "More" }),
    ]);
    heatmapWrap.appendChild(legend);
    body.appendChild(heatmapWrap);

    const draw = () => {
      try {
        const w = heatmapWrap.clientWidth - 32;
        renderHeatmap(heatmapInner, leveled, Math.max(200, w));
      } catch (err) {
        console.error("[streakr] draw failed:", err);
      }
    };
    body.__skDraw = draw;
    currentDraw = draw;
    body.__skObserveTarget = heatmapWrap;

    if (cfg.showStats) {
      body.appendChild(
        h("div", { class: "sk-stats" }, [
          statCard("Total Contributions", stats.total.toLocaleString()),
          statCard("Best Streak", stats.best, " days"),
          streakMetricCard(stats, days),
          statCard("Active Days", stats.active.toLocaleString()),
        ]),
      );
    }
    return body;
  }

  function streakMetricCard(stats: StreakrStats, days: StreakrDay[]): HTMLElement {
    if (state.year === currentYearLabel()) {
      return statCard("Current Streak", stats.current, " days");
    }
    const activeRate = days.length ? Math.round((stats.active / days.length) * 100) : 0;
    return statCard("Active Rate", activeRate, "%");
  }

  function statCard(label: string, value: string | number, suffix?: string): HTMLElement {
    return h("div", { class: "sk-stat" }, [
      h("div", { class: "sk-stat-label", text: label }),
      h("div", { class: "sk-stat-value" }, [
        document.createTextNode(String(value)),
        suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
      ]),
    ]);
  }

  function renderYearModal(card: Element): void {
    const overlay = h("div", { class: "sk-modal-overlay", onclick: () => closeYearModal() });
    const modal = h("div", {
      class: "sk-modal",
      onclick: (e: Event) => e.stopPropagation(),
    });
    modal.appendChild(
      h("div", { class: "sk-modal-header" }, [
        h("div", { class: "sk-modal-title", text: "Select year" }),
        h("button", {
          class: "sk-modal-close",
          "aria-label": "Close",
          onclick: () => closeYearModal(),
          html: trustedHtml(
            '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
          ),
        }),
      ]),
    );
    const grid = h("div", { class: "sk-modal-grid" });
    cfg.years
      .slice()
      .reverse()
      .forEach((y) => {
        const days = cfg.getDays(y) || [];
        const tot = days.reduce((s, d) => s + (d.total || 0), 0);
        grid.appendChild(
          h(
            "button",
            {
              class: "sk-modal-year" + (state.year === y ? " active" : ""),
              onclick: () => {
                setYear(y);
                closeYearModal();
              },
            },
            [
              h("div", { class: "sk-modal-year-num", text: String(y) }),
              h("div", {
                class: "sk-modal-year-count",
                text: tot.toLocaleString() + " contributions",
              }),
            ],
          ),
        );
      });
    modal.appendChild(grid);
    overlay.appendChild(modal);
    card.appendChild(overlay);
  }

  function currentYearLabel(): number | null {
    return cfg.years.length ? Math.max(...cfg.years) : null;
  }

  function setYear(y: number): void {
    state.year = y;
    cfg.onYearChange?.(y);
    render();
  }

  function toggleProvider(key: string): void {
    state.providers[key] = !state.providers[key];
    cfg.onProviderToggle?.(key, state.providers[key], { ...state.providers });
    render();
  }

  function enableAllProviders(): void {
    state.providers = enabledProviderState(cfg.providers);
    render();
  }

  function openYearModal(): void {
    state.yearModalOpen = true;
    render();
  }

  function closeYearModal(): void {
    state.yearModalOpen = false;
    render();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape" && state.yearModalOpen) closeYearModal();
  }

  document.addEventListener("keydown", onKey);
  setupThemeListener();
  render();

  return {
    update(patch: Partial<StreakrOptions>): void {
      // Skip undefined values so callers can spread partial patches without
      // accidentally clobbering resolved defaults (e.g. theme: undefined).
      for (const key of Object.keys(patch) as (keyof StreakrOptions)[]) {
        const value = patch[key];
        if (value !== undefined) {
          (cfg as unknown as Record<string, unknown>)[key] = value;
        }
      }
      if (patch.theme !== undefined) {
        setupThemeListener();
      }
      render();
    },
    setYear,
    setProviders(next: StreakrProviders): void {
      state.providers = { ...state.providers, ...next };
      render();
    },
    destroy(): void {
      resizeObs.disconnect();
      cleanupThemeListener();
      document.removeEventListener("keydown", onKey);
      tooltipEl.remove();
      root.remove();
    },
  };
}

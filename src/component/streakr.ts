import type {
  StreakrDay,
  StreakrInstance,
  StreakrLeveledDay,
  StreakrOptions,
  StreakrProvider,
  StreakrProviders,
  StreakrThemeMode,
} from "../types";
import {
  DAY_LABELS,
  fmtDateLong,
  gridFromDays,
  monthHeaders,
  padDaysToRange,
  padDaysToYear,
  yearToDateRange,
} from "./calendar";
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
  today: Date;
  getDays: (year: number) => StreakrDay[];
  providers: StreakrProvider[];
  onYearChange: ((year: number) => void) | null;
  onProviderToggle: ((key: string, enabled: boolean, providers: StreakrProviders) => void) | null;
}

const dayCount = (day: StreakrDay, key: string): number => day.sources?.[key] ?? 0;

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
    today: options.today ?? new Date(),
    getDays: options.getDays ?? (() => []),
    providers: options.providers ?? DEFAULT_PROVIDERS,
    onYearChange: options.onYearChange ?? null,
    onProviderToggle: options.onProviderToggle ?? null,
  };

  if (!cfg.target) {
    throw new Error("streakr: `target` is required");
  }
  if (cfg.year == null && cfg.years.length) {
    cfg.year = cfg.years[cfg.years.length - 1];
  }

  const state: InternalState = {
    year: cfg.year,
    providers: enabledProviderState(cfg.providers),
    yearModalOpen: false,
  };

  const syncProviderState = (): void => {
    state.providers = syncProviders(cfg.providers, state.providers);
  };

  const activeDayTotal = (day: StreakrDay): number =>
    day.sources == null
      ? day.total
      : cfg.providers
          .filter((provider) => state.providers[provider.key])
          .reduce((total, provider) => total + dayCount(day, provider.key), 0);

  const root = h("div", { class: "sk-root" }) as HTMLElement;
  cfg.target.appendChild(root);

  const tooltipEl = h("div", { class: "sk-tooltip" }) as HTMLElement;
  root.appendChild(tooltipEl);
  let currentDraw: (() => void) | null = null;
  const resizeObs = new ResizeObserver(() => currentDraw?.());

  let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  const getActiveTheme = (): "dark" | "light" => {
    if (cfg.theme !== "system") return cfg.theme;
    const isDark = globalThis.window?.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return isDark ? "dark" : "light";
  };

  const cleanupThemeListener = (): void => {
    if (mediaQueryListener && globalThis.window?.matchMedia) {
      globalThis.window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", mediaQueryListener);
    }
    mediaQueryListener = null;
  };

  const setupThemeListener = (): void => {
    if (!globalThis.window?.matchMedia) return;
    cleanupThemeListener();
    if (cfg.theme === "system") {
      const mediaQuery = globalThis.window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (e: MediaQueryListEvent) => {
        root.dataset.theme = e.matches ? "dark" : "light";
      };
      mediaQuery.addEventListener("change", mediaQueryListener);
    }
  };

  const applyAccentVars = (el: HTMLElement): void => {
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
  };

  const visibleYears = (): { visible: number[]; all: number[]; hasMore: boolean } => {
    const all = cfg.years.slice().reverse();
    return {
      visible: all.slice(0, MAX_VISIBLE_YEARS),
      all,
      hasMore: all.length > MAX_VISIBLE_YEARS,
    };
  };

  const getCurrentDays = (): StreakrDay[] => {
    if (cfg.state !== "ready" || state.year == null) return [];
    const currentYearDays = (cfg.getDays(state.year) || []).map((day) => ({
      ...day,
      total: activeDayTotal(day),
    }));
    if (!isCurrentYear()) return currentYearDays;
    const { start, end } = yearToDateRange(cfg.today);
    return currentYearDays.filter((day) => day.date >= start && day.date <= end);
  };

  const showTooltip = (e: MouseEvent, day: StreakrDay): void => {
    tooltipEl.replaceChildren();
    tooltipEl.appendChild(h("div", { class: "tt-date", text: fmtDateLong(day.date) }));
    tooltipEl.appendChild(h("div", { class: "tt-total", text: formatTotalLabel(day.total) }));
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
  };

  const moveTooltip = (e: MouseEvent): void => {
    tooltipEl.style.left = e.clientX + 14 + "px";
    tooltipEl.style.top = e.clientY + 14 + "px";
  };

  const hideTooltip = (): void => {
    tooltipEl.classList.remove("visible");
  };

  const bindCellEvents = (rect: SVGElement, day: StreakrDay): void => {
    rect.addEventListener("mouseenter", (e) => showTooltip(e, day));
    rect.addEventListener("mousemove", (e) => moveTooltip(e));
    rect.addEventListener("mouseleave", hideTooltip);
  };

  const buildHeatmapCell = (
    day: StreakrLeveledDay | null,
    ri: number,
    sq: number,
    colStep: number,
  ): SVGElement => {
    const rect = svg("rect", {
      class: day ? "sk-heatmap-cell" : null,
      y: ri * colStep,
      width: sq,
      height: sq,
      rx: Math.max(2, sq * 0.22),
      fill: day ? `var(--sk-heat-${day.level})` : "transparent",
      style: { cursor: day ? "pointer" : "default" },
    });
    if (day) {
      bindCellEvents(rect, day);
    }
    return rect;
  };

  const buildHeatmapColumn = (
    col: (StreakrLeveledDay | null)[],
    ci: number,
    sq: number,
    colStep: number,
  ): SVGElement => {
    const colG = svg("g", { transform: `translate(${ci * colStep}, 0)` });
    col.forEach((day, ri) => {
      colG.appendChild(buildHeatmapCell(day, ri, sq, colStep));
    });
    return colG;
  };

  const renderHeatmap = (
    wrap: HTMLElement,
    days: StreakrLeveledDay[],
    containerW: number,
  ): void => {
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
      role: "img",
      "aria-label": isCurrentYear()
        ? `Contribution heatmap for ${state.year ?? "selected year"} year to date`
        : `Contribution heatmap for ${state.year ?? "selected year"}`,
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

    wrap.replaceChildren(h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]));
  };

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

  const isCurrentYear = (): boolean => state.year === cfg.today.getFullYear();

  const getHeatmapDays = (days: StreakrDay[]): StreakrDay[] => {
    if (state.year == null) return days;
    if (isCurrentYear()) {
      const { start, end } = yearToDateRange(cfg.today);
      return padDaysToRange(days, start, end);
    }
    return padDaysToYear(days, state.year);
  };

  const computeRenderFlags = (): RenderFlags => {
    const days = getCurrentDays();
    const heatmapDays = getHeatmapDays(days);
    const stats = computeStats(heatmapDays);
    const yearTotal = heatmapDays.reduce((a, d) => a + d.total, 0);
    const leveled = levelize(heatmapDays);
    const isLoading = cfg.state === "loading";
    const isEmpty = cfg.state === "empty" || (cfg.state === "ready" && yearTotal === 0);
    const hasTotalOnlyDays = days.some((day) => day.sources == null && day.total > 0);
    const allOff =
      !hasTotalOnlyDays &&
      cfg.providers.length > 0 &&
      cfg.providers.every((p) => !state.providers[p.key]);
    const providersWithDataCount =
      cfg.state === "ready"
        ? cfg.providers.filter((p) => days.some((d) => dayCount(d, p.key) > 0)).length
        : 0;
    return { isLoading, isEmpty, allOff, days, providersWithDataCount, leveled, stats };
  };

  const renderTitleRow = (): HTMLElement => {
    const subtitleText = isCurrentYear() ? "Year to date" : String(state.year ?? "");
    return h("div", { class: "sk-title-row" }, [
      h("div", { class: "sk-brand" }, [
        h("div", { class: "sk-logo" }, [logoR()]),
        h("div", { class: "sk-title", text: "streakr" }),
        h("div", { class: "sk-subtitle", text: subtitleText }),
      ]),
    ]);
  };

  const buildYearTab = (year: number, isLoading: boolean): HTMLElement =>
    h("button", {
      class: "sk-year-tab" + (state.year === year ? " active" : ""),
      onclick: () => setYear(year),
      disabled: isLoading || undefined,
      text: String(year),
    });

  const renderYearsList = (isLoading: boolean): HTMLElement => {
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
  };

  const shouldRenderProviderRow = (flags: RenderFlags): boolean =>
    !flags.isLoading &&
    !flags.isEmpty &&
    cfg.showProviders &&
    cfg.providers.length > 0 &&
    flags.providersWithDataCount > 1;

  const renderYearsBar = (flags: RenderFlags): HTMLElement => {
    const yearsBar = h("div", { class: "sk-years" });
    yearsBar.dataset.noProviders = String(!cfg.showProviders);
    yearsBar.appendChild(renderYearsList(flags.isLoading));
    if (shouldRenderProviderRow(flags)) {
      yearsBar.appendChild(renderProviderRow());
    }
    return yearsBar;
  };

  const renderHeader = (flags: RenderFlags): HTMLElement => {
    const header = h("div", { class: "sk-header" });
    header.appendChild(renderTitleRow());
    header.appendChild(renderYearsBar(flags));
    return header;
  };

  const appendBody = (card: Element, flags: RenderFlags): void => {
    const stateBody = [
      [flags.isLoading, renderLoadingBody],
      [flags.allOff, renderNoProviders],
      [flags.isEmpty, renderEmpty],
    ].find(([matches]) => matches) as [boolean, () => HTMLElement] | undefined;

    if (stateBody) {
      card.appendChild(stateBody[1]());
      return;
    }

    const body = renderReadyBody(flags.leveled, flags.stats) as ReadyBody;
    card.appendChild(body);
    body.__skDraw?.();
    if (body.__skObserveTarget) {
      resizeObs.observe(body.__skObserveTarget);
    }
  };

  const render = (): void => {
    syncProviderState();
    hideTooltip();
    resizeObs.disconnect();
    currentDraw = null;

    const wasOpen = state.yearModalOpen;
    const flags = computeRenderFlags();

    root.replaceChildren(tooltipEl);
    root.dataset.theme = getActiveTheme();
    applyAccentVars(root);

    const card = h("div", { class: "sk-card" });
    root.appendChild(card);
    card.appendChild(renderHeader(flags));
    appendBody(card, flags);

    if (wasOpen) {
      renderYearModal(card);
    }
  };

  const renderProviderRow = (): HTMLElement => {
    const row = h("div", { class: "sk-providers" });
    const totals = computeProviderTotals();
    cfg.providers.forEach((p) => {
      const active = !!state.providers[p.key];
      const total = totals[p.key].toLocaleString();
      const iconHtml = providerIconHtml(p);
      const btn = h(
        "button",
        {
          class: "sk-provider" + (active ? " active" : ""),
          title: p.name + " — " + total,
          "aria-label": `${p.name}: ${total} contributions, ${active ? "enabled" : "disabled"}`,
          "aria-pressed": active,
          onclick: () => toggleProvider(p.key),
        },
        [
          h("span", {
            class: "sk-provider-icon",
            html: iconHtml ? trustedHtml(iconHtml) : undefined,
            style: iconHtml ? undefined : { background: p.color, borderRadius: "50%" },
          }),
          h("span", { class: "sk-provider-count", text: total }),
        ],
      );
      row.appendChild(btn);
    });
    return row;
  };

  const computeProviderTotals = (): Record<string, number> => {
    const totals = Object.fromEntries(cfg.providers.map((p) => [p.key, 0]));
    if (cfg.state !== "ready" || state.year == null) return totals;
    const raw = getCurrentDays();
    raw.forEach((d) => {
      cfg.providers.forEach((p) => {
        totals[p.key] += dayCount(d, p.key);
      });
    });
    return totals;
  };

  const renderSkeletonHeatmap = (containerW: number): SVGElement => {
    const cols = 53;
    const labelsW = 28;
    const trailingW = 8;
    const targetGap = 3;
    const rawSq = (containerW - labelsW - trailingW) / cols - targetGap;
    const sq = Math.max(9, Math.min(11, rawSq));
    const gap = Math.max(2, Math.min(3, Math.round(sq * 0.25)));
    const colStep = sq + gap;
    const H = 7 * colStep + 24;
    const W = labelsW + cols * colStep + trailingW;
    const fontSize = Math.max(9, Math.min(11, sq * 0.82));

    const svgEl = svg("svg", {
      class: "sk-heatmap-svg sk-heatmap-svg--skeleton",
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Loading contribution heatmap",
    });

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    for (let i = 0; i < months.length; i++) {
      svgEl.appendChild(
        svg(
          "text",
          {
            x: labelsW + i * Math.floor(cols / 12) * colStep,
            y: 10,
            fill: "var(--sk-text-muted)",
            "font-size": fontSize,
            "font-family": "'Geist', sans-serif",
          },
          months[i],
        ),
      );
    }

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
    for (let ci = 0; ci < cols; ci++) {
      const colG = svg("g", { transform: `translate(${ci * colStep}, 0)` });
      for (let ri = 0; ri < 7; ri++) {
        colG.appendChild(
          svg("rect", {
            y: ri * colStep,
            width: sq,
            height: sq,
            rx: Math.max(2, sq * 0.22),
            fill: "var(--sk-heat-0)",
          }),
        );
      }
      g.appendChild(colG);
    }
    svgEl.appendChild(g);
    return svgEl;
  };

  const renderLoadingBody = (): HTMLElement => {
    const heatmapWrap = h("div", { class: "sk-heatmap-wrap" });
    const heatmapInner = h("div", { class: "sk-heatmap-svg-wrap" });
    const svgEl = renderSkeletonHeatmap(Math.max(200, heatmapWrap.clientWidth - 32));
    heatmapInner.appendChild(svgEl);
    heatmapWrap.appendChild(heatmapInner);

    const legend = h("div", { class: "sk-legend" }, [
      h("span", { text: "Less" }),
      ...[0, 1, 2, 3, 4].map((i) =>
        h("span", { class: "sk-legend-sq", style: { background: `var(--sk-heat-${i})` } }),
      ),
      h("span", { text: "More" }),
    ]);
    heatmapWrap.appendChild(legend);

    const skel = (w: number, hpx: number) =>
      h("div", {
        class: "sk-skeleton",
        style: { width: w + "px", height: hpx + "px", marginBottom: "10px" },
      });
    const stat = () => h("div", { class: "sk-stat" }, [skel(90, 11), skel(60, 26)]);

    return h("div", { class: "sk-body" }, [
      heatmapWrap,
      h("div", { class: "sk-stats" }, [stat(), stat(), stat(), stat()]),
    ]);
  };

  const renderEmpty = (): HTMLElement =>
    h("div", { class: "sk-empty" }, [
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
          (isCurrentYear() ? "the year to date" : String(state.year ?? "")),
      }),
      h("div", {
        class: "sk-empty-sub",
        text: "When you commit, push, or open PRs across your connected accounts, they'll show up here.",
      }),
    ]);

  const renderNoProviders = (): HTMLElement =>
    h("div", { class: "sk-noprov" }, [
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

  const renderReadyBody = (leveled: StreakrLeveledDay[], stats: StreakrStats): HTMLElement => {
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
      const contextualStat = isCurrentYear()
        ? statCard("Current Streak", stats.current, " days")
        : statCard("Active Rate", formatActiveRate(stats.active, state.year), "%");
      body.appendChild(
        h("div", { class: "sk-stats" }, [
          statCard("Total Contributions", stats.total.toLocaleString()),
          statCard("Best Streak", stats.best, " days"),
          contextualStat,
          statCard("Active Days", stats.active.toLocaleString()),
        ]),
      );
    }
    return body;
  };

  const statCard = (label: string, value: string | number, suffix?: string): HTMLElement =>
    h("div", { class: "sk-stat" }, [
      h("div", { class: "sk-stat-label", text: label }),
      h("div", { class: "sk-stat-value" }, [
        document.createTextNode(String(value)),
        suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
      ]),
    ]);

  const formatActiveRate = (activeDays: number, year: number | null): string => {
    if (year == null) return "0";
    const totalDays = padDaysToYear([], year).length;
    return ((activeDays / totalDays) * 100).toFixed(1);
  };

  const renderYearModal = (card: Element): void => {
    const overlay = h("div", { class: "sk-modal-overlay", onclick: () => closeYearModal() });
    const modal = h("div", {
      class: "sk-modal",
      role: "dialog",
      "aria-modal": true,
      "aria-label": "Select year",
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
            [h("div", { class: "sk-modal-year-num", text: String(y) })],
          ),
        );
      });
    modal.appendChild(grid);
    overlay.appendChild(modal);
    card.appendChild(overlay);
  };

  const setYear = (y: number): void => {
    state.year = y;
    cfg.onYearChange?.(y);
    render();
  };

  const toggleProvider = (key: string): void => {
    state.providers[key] = !state.providers[key];
    cfg.onProviderToggle?.(key, state.providers[key], { ...state.providers });
    render();
  };

  const enableAllProviders = (): void => {
    state.providers = enabledProviderState(cfg.providers);
    render();
  };

  const openYearModal = (): void => {
    state.yearModalOpen = true;
    render();
  };

  const closeYearModal = (): void => {
    state.yearModalOpen = false;
    render();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && state.yearModalOpen) {
      closeYearModal();
    }
  };

  document.addEventListener("keydown", onKey);
  setupThemeListener();
  render();

  return {
    update(patch: Partial<StreakrOptions>): void {
      Object.keys(patch)
        .map((k) => k as keyof StreakrOptions)
        .forEach((key) => {
          const value = patch[key];
          if (value !== undefined) {
            (cfg as unknown as Record<string, unknown>)[key] = value;
          }
        });
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

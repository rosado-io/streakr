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
  dayAngle,
  fmtDateLong,
  fmtDateShort,
  gridFromDays,
  localDateKey,
  monthHeaders,
  MONTH_LABELS_SHORT,
  padDaysToRange,
  padDaysToYear,
  polarToCartesian,
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
  selectedDay: Date;
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
    selectedDay: cfg.today,
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

  const tooltipEl = h("div", {
    class: "sk-tooltip",
    role: "tooltip",
    "aria-live": "polite",
  }) as HTMLElement;
  root.appendChild(tooltipEl);
  let currentDraw: (() => void) | null = null;
  let skipNextResizeRedraw = false;
  let wasLoading = false;
  const resizeObs = new ResizeObserver(() => {
    if (skipNextResizeRedraw) {
      skipNextResizeRedraw = false;
      return;
    }
    currentDraw?.();
  });
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

  const MOBILE_BREAKPOINT = 520;

  const isMobileHeatmap = (wrap: HTMLElement): boolean =>
    wrap.getBoundingClientRect().width < MOBILE_BREAKPOINT;

  const HEATMAP_DAY_LABEL_ROWS = [1, 3, 5];

  interface HeatmapGeometry {
    labelsW: number;
    trailingW: number;
    sq: number;
    colStep: number;
    height: number;
    width: number;
    fontSize: number;
  }

  type HeatmapCellBuilder = (
    day: StreakrLeveledDay | null,
    ri: number,
    sq: number,
    colStep: number,
    ci: number,
  ) => SVGElement;

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
      style: {
        cursor: day ? "pointer" : "default",
      },
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
    buildCell: HeatmapCellBuilder,
  ): SVGElement => {
    const colG = svg("g", { transform: `translate(${ci * colStep}, 0)` });
    col.forEach((day, ri) => {
      colG.appendChild(buildCell(day, ri, sq, colStep, ci));
    });
    return colG;
  };

  const getHeatmapGeometry = (
    colsLength: number,
    containerW: number,
    wrap?: HTMLElement,
  ): HeatmapGeometry => {
    const labelsW = 28;
    const trailingW = 8;
    const gridW = Math.max(
      0,
      (containerW || wrap?.getBoundingClientRect().width || 820) - labelsW - trailingW,
    );
    const targetGap = 3;
    const rawSq = gridW / Math.max(1, colsLength) - targetGap;
    const sq = Math.max(9, Math.min(11, rawSq));
    const gap = Math.max(2, Math.min(3, Math.round(sq * 0.25)));
    const colStep = sq + gap;

    return {
      labelsW,
      trailingW,
      sq,
      colStep,
      height: 7 * colStep + 24,
      width: labelsW + colsLength * colStep + trailingW,
      fontSize: Math.max(9, Math.min(11, sq * 0.82)),
    };
  };

  const appendHeatmapLabels = (
    svgEl: SVGElement,
    headers: { col: number; label: string }[],
    geometry: HeatmapGeometry,
  ): void => {
    const { labelsW, sq, colStep, fontSize } = geometry;

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

    HEATMAP_DAY_LABEL_ROWS.forEach((d, i) => {
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
  };

  const createHeatmapSvg = (
    cols: (StreakrLeveledDay | null)[][],
    {
      className,
      ariaLabel,
      containerW,
      wrap,
      buildCell,
    }: {
      className: string;
      ariaLabel: string;
      containerW: number;
      wrap?: HTMLElement;
      buildCell?: HeatmapCellBuilder;
    },
  ): SVGElement => {
    const geometry = getHeatmapGeometry(cols.length, containerW, wrap);
    const { labelsW, sq, colStep, height, width } = geometry;
    const svgEl = svg("svg", {
      class: className,
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": ariaLabel,
    });
    const cellBuilder = buildCell ?? buildHeatmapCell;

    appendHeatmapLabels(svgEl, monthHeaders(cols), geometry);

    const g = svg("g", { transform: `translate(${labelsW}, 18)` });
    cols.forEach((col, ci) => {
      g.appendChild(buildHeatmapColumn(col, ci, sq, colStep, cellBuilder));
    });
    svgEl.appendChild(g);

    return svgEl;
  };

  const buildRevealHeatmapCell =
    (totalCols: number): HeatmapCellBuilder =>
    (day, ri, sq, colStep, ci) => {
      const rect = svg("rect", {
        class: day ? "sk-heatmap-cell sk-heatmap-cell--reveal" : null,
        y: ri * colStep,
        width: sq,
        height: sq,
        rx: Math.max(2, sq * 0.22),
        fill: day ? "var(--sk-heat-0)" : "transparent",
        style: day
          ? {
              cursor: "pointer",
              "--sk-cell-final": `var(--sk-heat-${day.level})`,
              animationDelay: `${((ci * HEATMAP_SKELETON_SWEEP_MS) / totalCols).toFixed(2)}ms`,
            }
          : { cursor: "default" },
      });
      if (day) {
        bindCellEvents(rect, day);
      }
      return rect;
    };

  const renderHeatmap = (
    wrap: HTMLElement,
    days: StreakrLeveledDay[],
    containerW: number,
    isRevealing = false,
  ): void => {
    const cols = gridFromDays(days);
    const svgEl = createHeatmapSvg(cols, {
      className: "sk-heatmap-svg",
      ariaLabel: isCurrentYear()
        ? `Contribution heatmap for ${state.year ?? "selected year"} year to date`
        : `Contribution heatmap for ${state.year ?? "selected year"}`,
      containerW,
      wrap,
      ...(isRevealing ? { buildCell: buildRevealHeatmapCell(cols.length) } : {}),
    });

    wrap.replaceChildren(h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]));
  };

  const RING_SIZE = 360;
  const RING_CX = RING_SIZE / 2;
  const RING_CY = RING_SIZE / 2;
  const RING_INNER_R = 78;
  const RING_OUTER_R = 150;
  const RING_LINE_OUTER_R = RING_OUTER_R - 1;
  const RING_MONTH_LABEL_R = 164;
  const RING_HAND_START_R = 70;
  const RING_HAND_END_R = 154;
  const RING_DAY_STROKE_WIDTH = 2.85;
  const RING_CLICK_DRAG_TOLERANCE = 6;
  const RING_SUPPRESS_CLICK_MS = 350;
  const RING_SKELETON_REVOLUTION_MS = 2000;
  const HEATMAP_SKELETON_SWEEP_MS = 2860;

  // Day strokes scale with the viewBox while the guide circles use a fixed non-scaling
  // stroke, so an endpoint inset alone can't contain the rounded caps at every size/state.
  // Clipping to the exact annulus between the guide radii contains them regardless.
  let ringClipIdSeq = 0;

  const describeCirclePath = (cx: number, cy: number, r: number): string =>
    `M ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} Z`;

  const describeAnnulusPath = (cx: number, cy: number, innerR: number, outerR: number): string =>
    `${describeCirclePath(cx, cy, outerR)} ${describeCirclePath(cx, cy, innerR)}`;

  const ringLineColor = (level: number): string => `var(--sk-heat-${level})`;

  const ringDayAriaLabel = (day: StreakrLeveledDay): string =>
    `${day.date.getDate()} ${MONTH_LABELS_SHORT[day.date.getMonth()]} ${day.date.getFullYear()}, ${formatTotalLabel(day.total)}`;

  const dayStartMs = (day: Date): number =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

  const isFutureRingDay = (day: Date): boolean =>
    isCurrentYear() && dayStartMs(day) > dayStartMs(cfg.today);

  const dayIndexToAngle = (day: Date, totalDays: number): number => {
    const startOfYear = new Date(day.getFullYear(), 0, 1);
    const idx = Math.round((day.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    return dayAngle(Math.max(0, Math.min(totalDays - 1, idx)), totalDays);
  };

  const dayToHandRotation = (day: Date, totalDays: number): number =>
    dayIndexToAngle(day, totalDays) + Math.PI / 2;

  type RingDayLineAttrs = {
    class?: string | undefined;
    stroke: string;
    "stroke-linecap"?: "round";
    "data-date"?: string | undefined;
    "data-future"?: string | undefined;
    tabindex?: string | undefined;
    role?: string | undefined;
    "aria-label"?: string | undefined;
    style?: Partial<CSSStyleDeclaration> | undefined;
  };

  const createRingSvgBase = <T extends StreakrDay>(
    days: T[],
    svgClass: string,
    ariaLabel: string,
    dayLineAttrs: (day: T, i: number) => RingDayLineAttrs,
  ): SVGElement => {
    const totalDays = days.length;
    const svgEl = svg("svg", {
      class: svgClass,
      width: RING_SIZE,
      height: RING_SIZE,
      viewBox: `0 0 ${RING_SIZE} ${RING_SIZE}`,
      role: "img",
      "aria-label": ariaLabel,
    });

    const ringClipId = `sk-ring-clip-${++ringClipIdSeq}`;
    const ringClip = svg("defs", {}, [
      svg("clipPath", { id: ringClipId, clipPathUnits: "userSpaceOnUse" }, [
        svg("path", {
          d: describeAnnulusPath(RING_CX, RING_CY, RING_INNER_R, RING_OUTER_R),
          "clip-rule": "evenodd",
        }),
      ]),
    ]);

    const ringGroup = svg("g", { class: "sk-ring-days", "clip-path": `url(#${ringClipId})` });
    days.forEach((day, i) => {
      const angle = dayAngle(i, totalDays);
      const start = polarToCartesian(RING_CX, RING_CY, RING_INNER_R, angle);
      const end = polarToCartesian(RING_CX, RING_CY, RING_LINE_OUTER_R, angle);
      ringGroup.appendChild(
        svg("line", {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          "stroke-width": RING_DAY_STROKE_WIDTH,
          ...dayLineAttrs(day, i),
        }),
      );
    });

    const ringYear = state.year ?? cfg.today.getFullYear();
    const monthLabels = svg("g", { class: "sk-ring-months" });
    for (let month = 0; month < 12; month++) {
      const firstDayOfMonth = new Date(ringYear, month, 1);
      const startOfYear = new Date(ringYear, 0, 1);
      const dayIndex = Math.round(
        (firstDayOfMonth.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
      );
      const angle = dayAngle(dayIndex, totalDays);
      const pos = polarToCartesian(RING_CX, RING_CY, RING_MONTH_LABEL_R, angle);
      monthLabels.appendChild(
        svg(
          "text",
          {
            x: pos.x,
            y: pos.y,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: "var(--sk-text-subtle)",
            "font-size": 9,
            "font-family": "'Geist', sans-serif",
          },
          MONTH_LABELS_SHORT[month],
        ),
      );
    }

    const innerRing = svg("circle", {
      class: "sk-ring-inner",
      cx: RING_CX,
      cy: RING_CY,
      r: RING_INNER_R,
      fill: "none",
    });

    const outerRing = svg("circle", {
      class: "sk-ring-outer",
      cx: RING_CX,
      cy: RING_CY,
      r: RING_OUTER_R,
      fill: "none",
    });

    svgEl.appendChild(ringClip);
    svgEl.appendChild(ringGroup);
    svgEl.appendChild(innerRing);
    svgEl.appendChild(outerRing);
    svgEl.appendChild(monthLabels);
    return svgEl;
  };

  const renderRingSvg = (days: StreakrLeveledDay[], selectedDay: Date): SVGElement => {
    const totalDays = days.length;
    const svgEl = createRingSvgBase(
      days,
      "sk-ring-svg",
      `Contribution ring for ${state.year ?? "selected year"}`,
      (day) => {
        const future = isFutureRingDay(day.date);
        const isSelected = !future && localDateKey(day.date) === localDateKey(selectedDay);
        const interactiveTabIndex = isSelected ? "0" : "-1";
        return {
          class: "sk-ring-line" + (future ? " sk-ring-line--future" : ""),
          stroke: future ? "transparent" : ringLineColor(day.level),
          "data-date": day.date.toISOString(),
          "data-future": future ? "true" : undefined,
          tabindex: future ? undefined : interactiveTabIndex,
          role: future ? undefined : "button",
          "aria-label": future ? undefined : ringDayAriaLabel(day),
        };
      },
    );

    const handStart = polarToCartesian(RING_CX, RING_CY, RING_HAND_START_R, -Math.PI / 2);
    const handEnd = polarToCartesian(RING_CX, RING_CY, RING_HAND_END_R, -Math.PI / 2);
    const hand = svg("g", { class: "sk-ring-hand" });
    hand.setAttribute(
      "transform",
      `rotate(${(dayToHandRotation(selectedDay, totalDays) * 180) / Math.PI}, ${RING_CX}, ${RING_CY})`,
    );
    hand.appendChild(
      svg("line", {
        class: "sk-ring-hand-line",
        x1: handStart.x,
        y1: handStart.y,
        x2: handEnd.x,
        y2: handEnd.y,
      }),
    );
    svgEl.appendChild(hand);
    return svgEl;
  };

  const renderSkeletonRing = (): SVGElement => {
    const skeletonYear = state.year ?? cfg.today.getFullYear();
    const skeletonDays = padDaysToYear([], skeletonYear);
    const totalDays = skeletonDays.length;
    return createRingSvgBase(
      skeletonDays,
      "sk-ring-svg sk-ring-svg--skeleton",
      "Loading contribution ring",
      (_day, i) => ({
        class: "sk-ring-skeleton-line",
        stroke: ringLineColor(0),
        "stroke-linecap": "round",
        style: {
          animationDelay: `${((i * RING_SKELETON_REVOLUTION_MS) / totalDays).toFixed(2)}ms`,
        },
      }),
    );
  };

  const ringCenterLabel = (day: StreakrDay): string =>
    `Selected ${fmtDateLong(day.date)}. Tap to reset to today.`;

  const updateRingCenter = (centerEl: HTMLElement, day: StreakrDay): void => {
    centerEl.setAttribute("aria-label", ringCenterLabel(day));
    const countEl = centerEl.querySelector<HTMLElement>(".sk-ring-count");
    const dateEl = centerEl.querySelector<HTMLElement>(".sk-ring-date");
    if (countEl) countEl.textContent = String(day.total);
    if (dateEl) dateEl.textContent = fmtDateShort(day.date);
  };

  const renderRingCenter = (day: StreakrDay): HTMLElement =>
    h(
      "button",
      {
        class: "sk-ring-center",
        "aria-label": ringCenterLabel(day),
        onclick: () => resetSelectedDay(),
      },
      [
        h("div", { class: "sk-ring-count", text: String(day.total) }),
        h("div", { class: "sk-ring-date", text: fmtDateShort(day.date) }),
        h("div", { class: "sk-ring-reset", text: "RESET" }),
      ],
    );

  const findDayByDate = (days: StreakrLeveledDay[], date: Date): StreakrLeveledDay => {
    const found = days.find((d) => localDateKey(d.date) === localDateKey(date));
    return found ?? days[0] ?? { date, total: 0, level: 0, sources: {} };
  };

  const resetSelectedDay = (): void => {
    state.selectedDay = cfg.today;
    render();
  };

  const bindRingEvents = (
    svgEl: SVGElement,
    handGroup: SVGGElement,
    centerEl: HTMLElement,
    days: StreakrLeveledDay[],
  ): void => {
    let pointerDownPoint: { x: number; y: number } | null = null;
    let suppressNextClick = false;
    let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;

    const setHandRotation = (rotation: number): void => {
      handGroup.setAttribute(
        "transform",
        `rotate(${(rotation * 180) / Math.PI}, ${RING_CX}, ${RING_CY})`,
      );
    };

    const selectDay = (day: StreakrLeveledDay, syncHand = true): void => {
      state.selectedDay = day.date;
      updateRingCenter(centerEl, day);
      if (syncHand) {
        setHandRotation(dayToHandRotation(day.date, days.length));
      }
    };

    const lineToDay = (target: EventTarget | null): StreakrLeveledDay | null => {
      if (!(target instanceof SVGElement) || !target.classList.contains("sk-ring-line")) {
        return null;
      }
      if (target.classList.contains("sk-ring-line--future")) {
        return null;
      }
      const dateAttr = target.dataset.date;
      if (!dateAttr) return null;
      return findDayByDate(days, new Date(dateAttr));
    };

    setHandRotation(dayToHandRotation(state.selectedDay, days.length));

    const clearSuppressResetTimer = (): void => {
      if (suppressResetTimer) {
        clearTimeout(suppressResetTimer);
        suppressResetTimer = null;
      }
    };

    const resetSuppressedClickAfterDrag = (): void => {
      clearSuppressResetTimer();
      suppressResetTimer = setTimeout(() => {
        suppressNextClick = false;
        suppressResetTimer = null;
      }, RING_SUPPRESS_CLICK_MS);
    };

    const hasMovedBeyondClickTolerance = (e: PointerEvent): boolean => {
      if (!pointerDownPoint) return false;
      return (
        Math.hypot(e.clientX - pointerDownPoint.x, e.clientY - pointerDownPoint.y) >
        RING_CLICK_DRAG_TOLERANCE
      );
    };

    const handlePointerDown = (e: PointerEvent): void => {
      clearSuppressResetTimer();
      suppressNextClick = false;
      pointerDownPoint = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent): void => {
      if (hasMovedBeyondClickTolerance(e)) {
        suppressNextClick = true;
      }
    };

    const handlePointerUp = (e: PointerEvent): void => {
      if (hasMovedBeyondClickTolerance(e)) {
        suppressNextClick = true;
      }
      pointerDownPoint = null;
      if (suppressNextClick) {
        resetSuppressedClickAfterDrag();
      }
    };

    const selectLineTarget = (target: EventTarget | null): void => {
      const selected = lineToDay(target);
      if (selected) {
        selectDay(selected);
      }
    };

    const handleLineInteraction = (e: PointerEvent): void => {
      if (suppressNextClick) {
        suppressNextClick = false;
        clearSuppressResetTimer();
        return;
      }
      selectLineTarget(e.target);
    };

    const handleLineKeydown = (e: KeyboardEvent): void => {
      const day = lineToDay(e.target);
      if (e.key === "Enter" || e.key === " ") {
        if (!day) return;
        e.preventDefault();
        selectDay(day);
        return;
      }
      if (!day) return;
      const focusableLines = Array.from(
        svgEl.querySelectorAll<SVGLineElement>(".sk-ring-line:not(.sk-ring-line--future)"),
      );
      const currentIndex = focusableLines.indexOf(e.target as SVGLineElement);
      if (currentIndex === -1) return;
      let targetIndex: number;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        targetIndex = Math.min(currentIndex + 1, focusableLines.length - 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        targetIndex = Math.max(currentIndex - 1, 0);
      } else if (e.key === "Home") {
        targetIndex = 0;
      } else if (e.key === "End") {
        targetIndex = focusableLines.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      if (targetIndex === currentIndex) return;
      const currentLine = focusableLines[currentIndex];
      const targetLine = focusableLines[targetIndex];
      currentLine.setAttribute("tabindex", "-1");
      targetLine.setAttribute("tabindex", "0");
      targetLine.focus();
      const dateAttr = targetLine.dataset.date;
      if (dateAttr) {
        selectDay(findDayByDate(days, new Date(dateAttr)));
      }
    };

    svgEl.addEventListener("pointerdown", handlePointerDown);
    svgEl.addEventListener("pointermove", handlePointerMove);
    svgEl.addEventListener("pointerup", handlePointerUp);
    svgEl.addEventListener("pointercancel", handlePointerUp);
    svgEl.addEventListener("pointerleave", handlePointerUp);
    svgEl.addEventListener("click", handleLineInteraction);
    svgEl.addEventListener("keydown", handleLineKeydown);
  };

  const renderRing = (wrap: HTMLElement, days: StreakrLeveledDay[]): void => {
    const selected = findDayByDate(days, state.selectedDay);
    state.selectedDay = selected.date;
    const svgEl = renderRingSvg(days, selected.date);
    const centerEl = renderRingCenter(selected);
    const handGroup = svgEl.querySelector<SVGGElement>(".sk-ring-hand");
    if (handGroup) {
      bindRingEvents(svgEl, handGroup, centerEl, days);
    }

    const container = h("div", { class: "sk-ring" }, [
      h("div", { class: "sk-ring-svg-wrap" }, [svgEl, centerEl]),
    ]);
    wrap.replaceChildren(container);
  };

  type ReadyBody = HTMLElement & {
    __skDraw?: () => void;
    __skObserveTarget?: HTMLElement;
  };

  interface RenderFlags {
    isLoading: boolean;
    isEmpty: boolean;
    allOff: boolean;
    canEnableAll: boolean;
    days: StreakrDay[];
    providersWithDataCount: number;
    leveled: StreakrLeveledDay[];
    stats: StreakrStats;
  }

  const isCurrentYear = (): boolean => state.year === cfg.today.getFullYear();

  const getHeatmapDays = (days: StreakrDay[]): StreakrDay[] => {
    if (state.year == null) return days;
    return padDaysToYear(days, state.year);
  };

  const getStatsDays = (days: StreakrDay[]): StreakrDay[] => {
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
    const statsDays = getStatsDays(days);
    const stats = computeStats(statsDays);
    const yearTotal = statsDays.reduce((a, d) => a + d.total, 0);
    const leveled = levelize(heatmapDays);
    const isLoading = cfg.state === "loading";
    const isEmpty = cfg.state === "empty" || (cfg.state === "ready" && yearTotal === 0);
    const hasTotalOnlyDays = days.some((day) => day.sources == null && day.total > 0);
    const allOff =
      !hasTotalOnlyDays &&
      cfg.providers.length > 0 &&
      cfg.providers.every((p) => !state.providers[p.key]);
    const canEnableAll =
      cfg.state === "ready" &&
      yearTotal === 0 &&
      cfg.providers.some(
        (provider) =>
          !state.providers[provider.key] && days.some((day) => dayCount(day, provider.key) > 0),
      );
    const providersWithDataCount =
      cfg.state === "ready"
        ? cfg.providers.filter((p) => days.some((d) => dayCount(d, p.key) > 0)).length
        : 0;
    return {
      isLoading,
      isEmpty,
      allOff,
      canEnableAll,
      days,
      providersWithDataCount,
      leveled,
      stats,
    };
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
    cfg.showProviders &&
    cfg.providers.length > 0 &&
    (flags.isLoading
      ? cfg.providers.length > 1
      : !flags.isEmpty && flags.providersWithDataCount > 1);

  const renderYearsBar = (flags: RenderFlags): HTMLElement => {
    const yearsBar = h("div", { class: "sk-years" });
    yearsBar.dataset.noProviders = String(!cfg.showProviders);
    yearsBar.appendChild(renderYearsList(flags.isLoading));
    if (shouldRenderProviderRow(flags)) {
      yearsBar.appendChild(renderProviderRow(flags.isLoading));
    }
    return yearsBar;
  };

  const renderHeader = (flags: RenderFlags): HTMLElement => {
    const header = h("div", { class: "sk-header" });
    header.appendChild(renderTitleRow());
    header.appendChild(renderYearsBar(flags));
    return header;
  };

  const appendBody = (card: Element, flags: RenderFlags, isRevealing: boolean): void => {
    const stateBody = [
      [flags.isLoading, renderLoadingBody],
      [flags.allOff, renderNoProviders],
      [flags.isEmpty, () => renderEmpty(flags.canEnableAll)],
    ].find(([matches]) => matches) as [boolean, () => HTMLElement] | undefined;

    if (stateBody) {
      const body = stateBody[1]() as ReadyBody;
      card.appendChild(body);
      body.__skDraw?.();
      if (body.__skObserveTarget) {
        skipNextResizeRedraw = true;
        resizeObs.observe(body.__skObserveTarget);
      }
      return;
    }

    const body = renderReadyBody(flags.leveled, flags.stats, isRevealing) as ReadyBody;
    card.appendChild(body);
    body.__skDraw?.();
    if (body.__skObserveTarget) {
      skipNextResizeRedraw = true;
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
    const isRevealing = wasLoading && !flags.isLoading;
    wasLoading = flags.isLoading;

    root.replaceChildren(tooltipEl);
    root.dataset.theme = getActiveTheme();
    applyAccentVars(root);

    const card = h("div", { class: "sk-card" });
    root.appendChild(card);
    card.appendChild(renderHeader(flags));
    appendBody(card, flags, isRevealing);

    if (wasOpen) {
      renderYearModal(card);
    }
  };

  const renderProviderRow = (isLoading = false): HTMLElement => {
    const row = h("div", { class: "sk-providers" });
    const totals = computeProviderTotals();
    cfg.providers.forEach((p) => {
      const active = !!state.providers[p.key];
      const total = totals[p.key].toLocaleString();
      const activeState = active ? "enabled" : "disabled";
      const ariaLabel = isLoading
        ? `${p.name}: loading contributions, ${activeState}`
        : `${p.name}: ${total} contributions, ${activeState}`;
      const iconHtml = providerIconHtml(p);
      const btn = h(
        "button",
        {
          class: "sk-provider" + (active ? " active" : ""),
          "aria-label": ariaLabel,
          "aria-pressed": String(active),
          onclick: () => toggleProvider(p.key),
        },
        [
          h("span", {
            class: "sk-provider-icon",
            html: iconHtml ? trustedHtml(iconHtml) : undefined,
            style: iconHtml ? undefined : { background: p.color, borderRadius: "50%" },
          }),
          h(
            "span",
            { class: "sk-provider-count" },
            isLoading
              ? h("span", {
                  class: "sk-skeleton sk-provider-count-skeleton",
                  "aria-hidden": true,
                })
              : total,
          ),
        ],
      );
      btn.addEventListener("mouseenter", (e) => {
        tooltipEl.replaceChildren();
        tooltipEl.appendChild(
          h("div", { class: "tt-row" }, [
            h("span", { class: "tt-label" }, [
              h("span", { class: "dot", style: { background: p.color } }),
              p.name,
            ]),
          ]),
        );
        moveTooltip(e);
        tooltipEl.classList.add("visible");
      });
      btn.addEventListener("mousemove", moveTooltip);
      btn.addEventListener("mouseleave", hideTooltip);
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

  const SKELETON_PEAK_LEVELS = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4] as const;

  const skeletonPeakLevel = (ci: number, ri: number): number => {
    const hash = Math.imul(ci * 7 + ri + 1, 2654435761) >>> 0;
    return SKELETON_PEAK_LEVELS[hash % SKELETON_PEAK_LEVELS.length];
  };

  const buildSkeletonHeatmapCell =
    (totalCols: number): HeatmapCellBuilder =>
    (day, ri, sq, colStep, ci) =>
      svg("rect", {
        class: day ? "sk-heatmap-skeleton-cell" : null,
        y: ri * colStep,
        width: sq,
        height: sq,
        rx: Math.max(2, sq * 0.22),
        fill: day ? "var(--sk-heat-0)" : "transparent",
        style: day
          ? {
              "--sk-cell-peak": `var(--sk-heat-${skeletonPeakLevel(ci, ri)})`,
              animationDelay: `${((ci * HEATMAP_SKELETON_SWEEP_MS) / totalCols).toFixed(2)}ms`,
            }
          : {},
      });

  const renderSkeletonHeatmap = (containerW: number): SVGElement => {
    const skeletonYear = state.year ?? cfg.today.getFullYear();
    const skeletonDays = padDaysToYear([], skeletonYear).map((day): StreakrLeveledDay => ({
      ...day,
      level: 0,
    }));
    const cols = gridFromDays(skeletonDays);
    return createHeatmapSvg(cols, {
      className: "sk-heatmap-svg sk-heatmap-svg--skeleton",
      ariaLabel: "Loading contribution heatmap",
      containerW,
      buildCell: buildSkeletonHeatmapCell(cols.length),
    });
  };

  const createReadyBodyShell = (): {
    body: ReadyBody;
    heatmapWrap: HTMLElement;
    heatmapInner: HTMLElement;
  } => {
    const body = h("div", { class: "sk-body" }) as ReadyBody;
    body.dataset.noStats = String(!cfg.showStats);

    const heatmapWrap = h("div", { class: "sk-heatmap-wrap" });
    const heatmapInner = h("div", { class: "sk-heatmap-stage" });
    heatmapWrap.appendChild(heatmapInner);
    heatmapWrap.appendChild(
      h("div", { class: "sk-legend" }, [
        h("span", { text: "Less" }),
        ...[0, 1, 2, 3, 4].map((i) =>
          h("span", { class: "sk-legend-sq", style: { background: `var(--sk-heat-${i})` } }),
        ),
        h("span", { text: "More" }),
      ]),
    );
    body.appendChild(heatmapWrap);

    return { body, heatmapWrap, heatmapInner };
  };

  const renderLoadingBody = (): HTMLElement => {
    const { body, heatmapWrap, heatmapInner } = createReadyBodyShell();

    const draw = () => {
      const isMobile = isMobileHeatmap(heatmapWrap);
      if (isMobile) {
        const svgEl = renderSkeletonRing();
        heatmapInner.replaceChildren(
          h("div", { class: "sk-ring" }, [h("div", { class: "sk-ring-svg-wrap" }, [svgEl])]),
        );
      } else {
        const w = heatmapWrap.clientWidth - 32;
        const svgEl = renderSkeletonHeatmap(Math.max(200, w));
        heatmapInner.replaceChildren(h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]));
      }
    };
    body.__skDraw = draw;
    currentDraw = draw;
    body.__skObserveTarget = heatmapWrap;

    if (cfg.showStats) {
      const contextualStat = isCurrentYear()
        ? loadingStatCard("Current Streak", " days", 2)
        : loadingStatCard("Active Rate", "%", 2);
      body.appendChild(
        h("div", { class: "sk-stats" }, [
          loadingStatCard("Total Contributions", undefined, 3),
          loadingStatCard("Best Streak", " days", 2),
          contextualStat,
          loadingStatCard("Active Days", undefined, 2),
        ]),
      );
    }

    return body;
  };

  const renderEnableAllButton = (): HTMLElement =>
    h("button", {
      class: "sk-year-tab",
      onclick: () => enableAllProviders(),
      text: "Enable all",
    });

  const renderEmpty = (canEnableAll = false): HTMLElement =>
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
      canEnableAll ? renderEnableAllButton() : null,
    ]);

  const renderNoProviders = (): HTMLElement =>
    h("div", { class: "sk-noprov" }, [
      h("span", { class: "sk-noprov-dot" }),
      h("div", {
        style: { flex: "1" },
        text: "All providers are disabled — toggle one above to see contributions.",
      }),
      renderEnableAllButton(),
    ]);

  const renderReadyBody = (
    leveled: StreakrLeveledDay[],
    stats: StreakrStats,
    isRevealing: boolean,
  ): HTMLElement => {
    const { body, heatmapWrap, heatmapInner } = createReadyBodyShell();

    let pendingReveal = isRevealing;
    const draw = () => {
      try {
        const isMobile = isMobileHeatmap(heatmapWrap);
        if (isMobile) {
          renderRing(heatmapInner, leveled);
        } else {
          const w = heatmapWrap.clientWidth - 32;
          renderHeatmap(heatmapInner, leveled, Math.max(200, w), pendingReveal);
        }
        pendingReveal = false;
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

  const loadingStatCard = (label: string, suffix?: string, digits: 2 | 3 = 2): HTMLElement =>
    h("div", { class: "sk-stat" }, [
      h("div", { class: "sk-stat-label", text: label }),
      h("div", { class: "sk-stat-value sk-stat-value--loading" }, [
        h("span", {
          class: `sk-skeleton sk-stat-value-skeleton sk-stat-value-skeleton--${digits}`,
          "aria-hidden": true,
        }),
        suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
      ]),
    ]);

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

    const trapFocus = (e: KeyboardEvent): void => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener("keydown", trapFocus);

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
    root.querySelector<HTMLButtonElement>(".sk-modal-year")?.focus();
  };

  const closeYearModal = (): void => {
    state.yearModalOpen = false;
    render();
    root.querySelector<HTMLButtonElement>(".sk-year-more")?.focus();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && state.yearModalOpen) {
      closeYearModal();
    }
  };

  type UpdatePatch = Partial<StreakrOptions>;
  type UpdateHandlers = {
    [Key in keyof StreakrOptions]-?: (patch: Pick<UpdatePatch, Key>) => void;
  };

  const updateHandlers = {
    target: ({ target }) => {
      if (target !== undefined) {
        throw new Error("Cannot update 'target' after mount. Destroy and recreate the instance.");
      }
    },
    theme: ({ theme }) => {
      if (theme !== undefined) {
        cfg.theme = theme;
        setupThemeListener();
      }
    },
    accent: ({ accent }) => {
      if (accent !== undefined) cfg.accent = accent;
    },
    tintHeatmap: ({ tintHeatmap }) => {
      if (tintHeatmap !== undefined) cfg.tintHeatmap = tintHeatmap;
    },
    showProviders: ({ showProviders }) => {
      if (showProviders !== undefined) cfg.showProviders = showProviders;
    },
    showStats: ({ showStats }) => {
      if (showStats !== undefined) cfg.showStats = showStats;
    },
    state: ({ state: nextState }) => {
      if (nextState !== undefined) cfg.state = nextState;
    },
    years: ({ years }) => {
      if (years !== undefined) {
        cfg.years = years;
        if (cfg.years.length && (state.year == null || !cfg.years.includes(state.year))) {
          state.year = cfg.years[cfg.years.length - 1];
        }
      }
    },
    year: ({ year }) => {
      if (year !== undefined) {
        cfg.year = year;
        state.year = year;
      }
    },
    today: ({ today }) => {
      if (today !== undefined) cfg.today = today;
    },
    getDays: ({ getDays }) => {
      if (getDays !== undefined) cfg.getDays = getDays;
    },
    providers: ({ providers }) => {
      if (providers !== undefined) cfg.providers = providers;
    },
    onYearChange: ({ onYearChange }) => {
      if (onYearChange !== undefined) cfg.onYearChange = onYearChange;
    },
    onProviderToggle: ({ onProviderToggle }) => {
      if (onProviderToggle !== undefined) cfg.onProviderToggle = onProviderToggle;
    },
  } satisfies UpdateHandlers;

  const isUpdateKey = (key: string): key is keyof typeof updateHandlers =>
    Object.prototype.hasOwnProperty.call(updateHandlers, key);

  document.addEventListener("keydown", onKey);
  setupThemeListener();
  render();

  return {
    update(patch: UpdatePatch): void {
      for (const key of Object.keys(patch)) {
        if (isUpdateKey(key)) {
          updateHandlers[key](patch);
        }
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

import {
  DAY_LABELS,
  fmtDateLong,
  gridFromDays,
  localDateKey,
  monthHeaders,
  padDaysToYear,
} from "../calendar";
import type { ComponentCtx } from "../config";
import { h, svg } from "../dom";
import { formatTotalLabel } from "../metrics";
import type { LeveledDay, RenderableDay } from "../types";

const MOBILE_BREAKPOINT = 520;
const HEATMAP_SKELETON_SWEEP_MS = 2860;

export const isMobileHeatmap = (wrap: HTMLElement): boolean =>
  wrap.getBoundingClientRect().width < MOBILE_BREAKPOINT;

const HEATMAP_DAY_LABEL_ROWS = [1, 3, 5];

export type BindCellEvents = (rect: SVGElement, day: RenderableDay) => void;

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
  day: LeveledDay | null,
  ri: number,
  sq: number,
  colStep: number,
  ci: number,
) => SVGElement;

const buildHeatmapCell =
  (bindCellEvents: BindCellEvents, totalCols: number, revealUntil?: Date): HeatmapCellBuilder =>
  (day, ri, sq, colStep, ci) => {
    const reveal =
      revealUntil !== undefined && day !== null && day.date.getTime() <= revealUntil.getTime();
    let cellClass: string | null = null;
    let cellFill = "transparent";
    if (reveal) {
      cellClass = "sk-heatmap-cell sk-heatmap-cell--reveal";
      cellFill = "var(--sk-heat-0)";
    } else if (day) {
      cellClass = "sk-heatmap-cell";
      cellFill = `var(--sk-heat-${day.level})`;
    }
    const rect = svg("rect", {
      class: cellClass,
      y: ri * colStep,
      width: sq,
      height: sq,
      rx: Math.max(2, sq * 0.22),
      fill: cellFill,
      style: {
        cursor: day ? "pointer" : "default",
        ...(reveal
          ? {
              "--sk-cell-peak": `var(--sk-heat-${wavePeakLevel(ci, ri)})`,
              "--sk-cell-final": `var(--sk-heat-${day.level})`,
              animationDelay: `${((ci * HEATMAP_SKELETON_SWEEP_MS) / totalCols).toFixed(2)}ms`,
            }
          : {}),
      },
    });
    if (day) {
      rect.setAttribute("data-date", day.dateKey);
      rect.setAttribute("tabindex", "-1");
      rect.setAttribute("role", "img");
      rect.setAttribute("aria-label", `${fmtDateLong(day.date)}, ${formatTotalLabel(day.total)}`);
      bindCellEvents(rect, day);
    }
    return rect;
  };

const buildHeatmapColumn = (
  col: (LeveledDay | null)[],
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
  cols: (LeveledDay | null)[][],
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
    buildCell: HeatmapCellBuilder;
  },
): SVGElement => {
  const geometry = getHeatmapGeometry(cols.length, containerW, wrap);
  const { labelsW, sq, colStep, height, width } = geometry;
  const svgEl = svg("svg", {
    class: className,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: "group",
    "aria-label": ariaLabel,
  });

  appendHeatmapLabels(svgEl, monthHeaders(cols), geometry);

  const g = svg("g", { transform: `translate(${labelsW}, 18)` });
  cols.forEach((col, ci) => {
    g.appendChild(buildHeatmapColumn(col, ci, sq, colStep, buildCell));
  });
  svgEl.appendChild(g);

  return svgEl;
};

export const renderHeatmap = (
  wrap: HTMLElement,
  days: LeveledDay[],
  containerW: number,
  ariaLabel: string,
  bindCellEvents: BindCellEvents,
  selectedDate: Date,
  revealUntil?: Date,
): void => {
  const cols = gridFromDays(days);
  const svgEl = createHeatmapSvg(cols, {
    className: "sk-heatmap-svg",
    ariaLabel,
    containerW,
    wrap,
    buildCell: buildHeatmapCell(bindCellEvents, cols.length, revealUntil),
  });
  bindHeatmapKeyboard(svgEl, selectedDate);

  wrap.replaceChildren(h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]));
};

const bindHeatmapKeyboard = (svgEl: SVGElement, selectedDate: Date): void => {
  const cells = Array.from(svgEl.querySelectorAll<SVGElement>(".sk-heatmap-cell"));
  const selectedKey = localDateKey(selectedDate);
  const initial = cells.find((cell) => cell.dataset.date === selectedKey) ?? cells[0];
  initial?.setAttribute("tabindex", "0");

  svgEl.addEventListener("keydown", (event) => {
    if (!(event.target instanceof SVGElement)) return;
    const currentIndex = cells.indexOf(event.target);
    if (currentIndex < 0) return;

    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = currentIndex + 7;
    else if (event.key === "ArrowLeft") nextIndex = currentIndex - 7;
    else if (event.key === "ArrowDown") nextIndex = currentIndex + 1;
    else if (event.key === "ArrowUp") nextIndex = currentIndex - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = cells.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      return;
    } else {
      return;
    }

    event.preventDefault();
    const next = cells[Math.max(0, Math.min(cells.length - 1, nextIndex))];
    if (!next || next === event.target) return;
    event.target.setAttribute("tabindex", "-1");
    next.setAttribute("tabindex", "0");
    next.focus();
  });
};

const WAVE_PEAK_LEVELS = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4] as const;

const wavePeakLevel = (ci: number, ri: number): number => {
  const hash = Math.imul(ci * 7 + ri + 1, 2654435761) >>> 0;
  return WAVE_PEAK_LEVELS[hash % WAVE_PEAK_LEVELS.length] ?? 0;
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
            "--sk-cell-peak": `var(--sk-heat-${wavePeakLevel(ci, ri)})`,
            animationDelay: `${((ci * HEATMAP_SKELETON_SWEEP_MS) / totalCols).toFixed(2)}ms`,
          }
        : {},
    });

export const renderSkeletonHeatmap = (ctx: ComponentCtx, containerW: number): SVGElement => {
  const skeletonYear = ctx.state.year ?? ctx.cfg.today.getFullYear();
  const skeletonDays = padDaysToYear([], skeletonYear).map((day): LeveledDay => ({
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

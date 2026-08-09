import {
  dayAngle,
  dayToHandRotation,
  fmtDateLong,
  fmtDateShort,
  localDateKey,
  MONTH_LABELS_SHORT,
  padDaysToYear,
  parseLocalDate,
  polarToCartesian,
} from "../calendar";
import type { ComponentCtx } from "../config";
import { h, svg } from "../dom";
import { formatTotalLabel } from "../metrics";
import { isCurrentYear } from "../selectors";
import { bindRingEvents } from "../ring-interaction";
import type { LeveledDay, RenderableDay } from "../types";

const RING_SIZE = 360;
export const RING_CX = RING_SIZE / 2;
export const RING_CY = RING_SIZE / 2;
export const RING_INNER_R = 78;
export const RING_OUTER_R = 150;
const RING_LINE_OUTER_R = RING_OUTER_R - 1;
const RING_MONTH_LABEL_R = 164;
const RING_HAND_START_R = 70;
const RING_HAND_END_R = 154;
const RING_DAY_STROKE_WIDTH = 2.85;
const RING_SKELETON_REVOLUTION_MS = 2000;

const describeCirclePath = (cx: number, cy: number, r: number): string =>
  `M ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} Z`;

const describeAnnulusPath = (cx: number, cy: number, innerR: number, outerR: number): string =>
  `${describeCirclePath(cx, cy, outerR)} ${describeCirclePath(cx, cy, innerR)}`;

const ringLineColor = (level: number): string => `var(--sk-heat-${level})`;

const ringDayAriaLabel = (day: LeveledDay): string =>
  `${day.date.getDate()} ${MONTH_LABELS_SHORT[day.date.getMonth()]} ${day.date.getFullYear()}, ${formatTotalLabel(day.total)}`;

const dayStartMs = (day: Date): number =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

const ringCenterLabel = (day: RenderableDay): string =>
  `Selected ${fmtDateLong(day.date)}. Tap to reset to today.`;

export const updateRingCenter = (centerEl: HTMLElement, day: RenderableDay): void => {
  centerEl.setAttribute("aria-label", ringCenterLabel(day));
  const countEl = centerEl.querySelector<HTMLElement>(".sk-ring-count");
  const dateEl = centerEl.querySelector<HTMLElement>(".sk-ring-date");
  if (countEl) countEl.textContent = String(day.total);
  if (dateEl) dateEl.textContent = fmtDateShort(day.date);
};

export const findDayByDateKey = (days: LeveledDay[], dateKey: string): LeveledDay => {
  const found = days.find((d) => d.dateKey === dateKey);
  return (
    found ?? days[0] ?? { date: parseLocalDate(dateKey), dateKey, total: 0, level: 0, sources: {} }
  );
};

export const findDayByDate = (days: LeveledDay[], date: Date): LeveledDay => {
  const dateKey = localDateKey(date);
  const found = days.find((d) => d.dateKey === dateKey);
  return found ?? days[0] ?? { date, dateKey, total: 0, level: 0, sources: {} };
};

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

export interface RingRenderer {
  renderRing: (wrap: HTMLElement, days: LeveledDay[]) => void;
  renderSkeletonRing: () => SVGElement;
  renderSkeletonRingCenter: () => HTMLElement;
}

// Module-level on purpose: several streakr instances can share a document, so
// clip-path ids must be unique across renderers, not just within one.
let ringClipIdSeq = 0;

export const createRingRenderer = (ctx: ComponentCtx, onResetDay: () => void): RingRenderer => {
  const isFutureRingDay = (day: Date): boolean =>
    isCurrentYear(ctx) && dayStartMs(day) > dayStartMs(ctx.cfg.today);

  const createRingSvgBase = <T extends RenderableDay>(
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

    const ringYear = ctx.state.year ?? ctx.cfg.today.getFullYear();
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

  const createHandGroup = (skeleton = false): SVGGElement => {
    const handStart = polarToCartesian(RING_CX, RING_CY, RING_HAND_START_R, -Math.PI / 2);
    const handEnd = polarToCartesian(RING_CX, RING_CY, RING_HAND_END_R, -Math.PI / 2);
    return svg("g", { class: skeleton ? "sk-ring-hand sk-ring-hand--skeleton" : "sk-ring-hand" }, [
      svg("line", {
        class: "sk-ring-hand-line",
        x1: handStart.x,
        y1: handStart.y,
        x2: handEnd.x,
        y2: handEnd.y,
      }),
    ]) as SVGGElement;
  };

  const renderRingSvg = (days: LeveledDay[], selectedDay: Date): SVGElement => {
    const totalDays = days.length;
    const svgEl = createRingSvgBase(
      days,
      "sk-ring-svg",
      `Contribution ring for ${ctx.state.year ?? "selected year"}`,
      (day) => {
        const future = isFutureRingDay(day.date);
        const isSelected = !future && localDateKey(day.date) === localDateKey(selectedDay);
        const interactiveTabIndex = isSelected ? "0" : "-1";
        return {
          class: "sk-ring-line" + (future ? " sk-ring-line--future" : ""),
          stroke: future ? "transparent" : ringLineColor(day.level),
          "data-date": day.dateKey,
          "data-future": future ? "true" : undefined,
          tabindex: future ? undefined : interactiveTabIndex,
          role: future ? undefined : "button",
          "aria-label": future ? undefined : ringDayAriaLabel(day),
        };
      },
    );

    const hand = createHandGroup();
    hand.setAttribute(
      "transform",
      `rotate(${(dayToHandRotation(selectedDay, totalDays) * 180) / Math.PI}, ${RING_CX}, ${RING_CY})`,
    );
    svgEl.appendChild(hand);
    return svgEl;
  };

  const renderRingCenter = (day: RenderableDay): HTMLElement =>
    h(
      "button",
      {
        class: "sk-ring-center",
        "aria-label": ringCenterLabel(day),
        onclick: () => onResetDay(),
      },
      [
        h("div", { class: "sk-ring-count", text: String(day.total) }),
        h("div", { class: "sk-ring-date", text: fmtDateShort(day.date) }),
        h("div", { class: "sk-ring-reset", text: "RESET" }),
      ],
    );

  const renderRing = (wrap: HTMLElement, days: LeveledDay[]): void => {
    const selected = findDayByDate(days, ctx.state.selectedDay);
    ctx.state.selectedDay = selected.date;
    const svgEl = renderRingSvg(days, selected.date);
    const centerEl = renderRingCenter(selected);
    const handGroup = svgEl.querySelector<SVGGElement>(".sk-ring-hand");
    if (handGroup) {
      bindRingEvents(ctx, svgEl, handGroup, centerEl, days);
    }

    const container = h("div", { class: "sk-ring" }, [
      h("div", { class: "sk-ring-svg-wrap" }, [svgEl, centerEl]),
    ]);
    wrap.replaceChildren(container);
  };

  const renderSkeletonRing = (): SVGElement => {
    const skeletonYear = ctx.state.year ?? ctx.cfg.today.getFullYear();
    const skeletonDays = padDaysToYear([], skeletonYear);
    const totalDays = skeletonDays.length;
    const svgEl = createRingSvgBase(
      skeletonDays,
      "sk-ring-svg sk-ring-svg--skeleton",
      "Loading contribution ring",
      (_day, i) => ({
        class: "sk-ring-skeleton-line",
        stroke: "transparent",
        "stroke-linecap": "round",
        style: {
          animationDelay: `${((i * RING_SKELETON_REVOLUTION_MS) / totalDays).toFixed(2)}ms`,
        },
      }),
    );
    svgEl.appendChild(createHandGroup(true));
    return svgEl;
  };

  const skeletonCenterDate = (): Date => {
    const year = ctx.state.year ?? ctx.cfg.today.getFullYear();
    return ctx.state.selectedDay.getFullYear() === year
      ? ctx.state.selectedDay
      : new Date(year, 0, 1);
  };

  const renderSkeletonRingCenter = (): HTMLElement =>
    h("div", { class: "sk-ring-center sk-ring-center--loading" }, [
      h("div", { class: "sk-ring-count" }, [
        h("span", { class: "sk-skeleton sk-ring-count-skeleton", "aria-hidden": true }),
      ]),
      h("div", { class: "sk-ring-date", text: fmtDateShort(skeletonCenterDate()) }),
      h("div", { class: "sk-ring-reset", text: "RESET" }),
    ]);

  return { renderRing, renderSkeletonRing, renderSkeletonRingCenter };
};

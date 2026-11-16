import type { ComponentCtx } from "./config";
import type { RenderableDay } from "./types";

/** The payload is detached from internal data and obeys the public day contract. */
export const notifyDaySelection = (ctx: ComponentCtx, day: RenderableDay): void => {
  const sources =
    day.sources === undefined
      ? undefined
      : Object.fromEntries(Object.entries(day.sources).filter(([key]) => ctx.state.sources[key]));
  ctx.cfg.onDaySelect?.({
    date: day.dateKey,
    count: day.total,
    ...(sources === undefined ? {} : { sources }),
  });
};

export const markSelectedDay = (root: Element, date: string): void => {
  root.querySelectorAll<SVGElement>('[data-date][role="button"]').forEach((cell) => {
    const selected = cell.dataset.date === date && cell.getAttribute("aria-disabled") !== "true";
    cell.setAttribute("aria-pressed", String(selected));
    cell.setAttribute("tabindex", selected ? "0" : "-1");
  });
};

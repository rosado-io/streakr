import type { StreakrSource } from "../types";
import { fmtDateLong } from "./calendar";
import type { ComponentCtx } from "./config";
import { sourceCount } from "./config";
import { h } from "./dom";
import { formatTotalLabel } from "./metrics";
import type { RenderableDay } from "./types";

export interface Tooltip {
  el: HTMLElement;
  show: (event: MouseEvent, day: RenderableDay) => void;
  showSourceLabel: (event: MouseEvent, source: StreakrSource) => void;
  move: (event: MouseEvent) => void;
  hide: () => void;
  bindCellEvents: (rect: SVGElement, day: RenderableDay) => void;
}

const TOOLTIP_OFFSET = 14;
const TOOLTIP_VIEWPORT_MARGIN = 8;

// Unique per instance so heatmap cells can reference their own tooltip with
// aria-describedby when several streakr instances share a document.
let tooltipIdSeq = 0;

export const createTooltip = (ctx: ComponentCtx): Tooltip => {
  const el = h("div", {
    class: "sk-tooltip",
    id: `sk-tooltip-${++tooltipIdSeq}`,
    role: "tooltip",
    "aria-live": "polite",
  }) as HTMLElement;

  const renderDay = (day: RenderableDay): void => {
    el.replaceChildren();
    el.appendChild(h("div", { class: "tt-date", text: fmtDateLong(day.date) }));
    el.appendChild(h("div", { class: "tt-total", text: formatTotalLabel(day.total) }));
    ctx.cfg.sources
      .filter((source) => ctx.state.sources[source.key])
      .map((source) => ({ source, value: sourceCount(day, source.key) }))
      .filter(({ value }) => value > 0)
      .forEach(({ source, value }) => {
        el.appendChild(
          h("div", { class: "tt-row" }, [
            h("span", { class: "tt-label" }, [
              h("span", { class: "dot", style: { background: source.color } }),
              source.name,
            ]),
            h("span", { class: "tt-val", text: String(value) }),
          ]),
        );
      });
  };

  const place = (x: number, y: number): void => {
    // Clamp to the viewport so cells near the right/bottom edges do not push
    // the tooltip off-screen. The tooltip is position: fixed and stays in the
    // a11y tree (opacity only), so offsetWidth/Height are always measurable.
    const maxX = window.innerWidth - el.offsetWidth - TOOLTIP_VIEWPORT_MARGIN;
    const maxY = window.innerHeight - el.offsetHeight - TOOLTIP_VIEWPORT_MARGIN;
    el.style.left = `${Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(x + TOOLTIP_OFFSET, maxX))}px`;
    el.style.top = `${Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(y + TOOLTIP_OFFSET, maxY))}px`;
  };

  const show = (event: MouseEvent, day: RenderableDay): void => {
    renderDay(day);
    place(event.clientX, event.clientY);
    el.classList.add("visible");
  };

  const showSourceLabel = (event: MouseEvent, source: StreakrSource): void => {
    el.replaceChildren();
    el.appendChild(
      h("div", { class: "tt-row" }, [
        h("span", { class: "tt-label" }, [
          h("span", { class: "dot", style: { background: source.color } }),
          source.name,
        ]),
      ]),
    );
    place(event.clientX, event.clientY);
    el.classList.add("visible");
  };

  const move = (event: MouseEvent): void => {
    place(event.clientX, event.clientY);
  };

  const hide = (): void => {
    el.classList.remove("visible");
  };

  const bindCellEvents = (rect: SVGElement, day: RenderableDay): void => {
    rect.addEventListener("mouseenter", (event) => show(event, day));
    rect.addEventListener("mousemove", move);
    rect.addEventListener("mouseleave", hide);
    rect.addEventListener("focus", () => {
      const bounds = rect.getBoundingClientRect();
      renderDay(day);
      place(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      rect.setAttribute("aria-describedby", el.id);
      el.classList.add("visible");
    });
    rect.addEventListener("blur", () => {
      rect.removeAttribute("aria-describedby");
      hide();
    });
  };

  return { el, show, showSourceLabel, move, hide, bindCellEvents };
};

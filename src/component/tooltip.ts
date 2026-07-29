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

export const createTooltip = (ctx: ComponentCtx): Tooltip => {
  const el = h("div", {
    class: "sk-tooltip",
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
    el.style.left = `${x + 14}px`;
    el.style.top = `${y + 14}px`;
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
      el.classList.add("visible");
    });
    rect.addEventListener("blur", hide);
  };

  return { el, show, showSourceLabel, move, hide, bindCellEvents };
};

import type { StreakrDay, StreakrProvider } from "../types";
import { fmtDateLong } from "./calendar";
import type { ComponentCtx } from "./config";
import { sourceCount } from "./config";
import { h } from "./dom";
import { formatTotalLabel } from "./metrics";

export interface Tooltip {
  el: HTMLElement;
  show: (e: MouseEvent, day: StreakrDay) => void;
  showProviderLabel: (e: MouseEvent, provider: StreakrProvider) => void;
  move: (e: MouseEvent) => void;
  hide: () => void;
  bindCellEvents: (rect: SVGElement, day: StreakrDay) => void;
}

export const createTooltip = (ctx: ComponentCtx): Tooltip => {
  const el = h("div", {
    class: "sk-tooltip",
    role: "tooltip",
    "aria-live": "polite",
  }) as HTMLElement;

  const show = (e: MouseEvent, day: StreakrDay): void => {
    el.replaceChildren();
    el.appendChild(h("div", { class: "tt-date", text: fmtDateLong(day.date) }));
    el.appendChild(h("div", { class: "tt-total", text: formatTotalLabel(day.total) }));
    ctx.cfg.providers
      .filter((provider) => ctx.state.providers[provider.key])
      .map((provider) => ({ provider, value: sourceCount(day, provider.key) }))
      .filter(({ value }) => value > 0)
      .forEach(({ provider, value }) => {
        el.appendChild(
          h("div", { class: "tt-row" }, [
            h("span", { class: "tt-label" }, [
              h("span", { class: "dot", style: { background: provider.color } }),
              provider.name,
            ]),
            h("span", { class: "tt-val", text: String(value) }),
          ]),
        );
      });
    el.style.left = e.clientX + 14 + "px";
    el.style.top = e.clientY + 14 + "px";
    el.classList.add("visible");
  };

  const showProviderLabel = (e: MouseEvent, provider: StreakrProvider): void => {
    el.replaceChildren();
    el.appendChild(
      h("div", { class: "tt-row" }, [
        h("span", { class: "tt-label" }, [
          h("span", { class: "dot", style: { background: provider.color } }),
          provider.name,
        ]),
      ]),
    );
    move(e);
    el.classList.add("visible");
  };

  const move = (e: MouseEvent): void => {
    el.style.left = e.clientX + 14 + "px";
    el.style.top = e.clientY + 14 + "px";
  };

  const hide = (): void => {
    el.classList.remove("visible");
  };

  const bindCellEvents = (rect: SVGElement, day: StreakrDay): void => {
    rect.addEventListener("mouseenter", (e) => show(e, day));
    rect.addEventListener("mousemove", (e) => move(e));
    rect.addEventListener("mouseleave", hide);
  };

  return { el, show, showProviderLabel, move, hide, bindCellEvents };
};

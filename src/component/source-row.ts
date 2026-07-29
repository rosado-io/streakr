import type { ComponentCtx } from "./config";
import { h, trustedHtml } from "./dom";
import { sourceIconHtml } from "./sources";
import type { Tooltip } from "./tooltip";

const renderSourceIcon = (source: ComponentCtx["cfg"]["sources"][number]): HTMLElement => {
  const builtInIcon = sourceIconHtml(source);
  const customIcon = source.icon?.();
  if (customIcon && customIcon.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error(`streakr: source "${source.key}" icon must return an SVG element`);
  }

  if (customIcon) {
    customIcon.setAttribute("aria-hidden", "true");
    customIcon.setAttribute("focusable", "false");
  }

  return h(
    "span",
    {
      class: "sk-source-icon",
      html: !customIcon && builtInIcon ? trustedHtml(builtInIcon) : undefined,
      style:
        customIcon || builtInIcon ? undefined : { background: source.color, borderRadius: "50%" },
    },
    customIcon,
  );
};

export const renderSourceRow = (
  ctx: ComponentCtx,
  tooltip: Tooltip,
  onToggle: (key: string) => void,
  totals: Readonly<Record<string, number>>,
  isLoading = false,
): HTMLElement => {
  const row = h("div", { class: "sk-sources", "aria-label": "Activity sources" });
  ctx.cfg.sources.forEach((source) => {
    const active = !!ctx.state.sources[source.key];
    const total = (totals[source.key] ?? 0).toLocaleString();
    const activeState = active ? "enabled" : "disabled";
    const ariaLabel = isLoading
      ? `${source.name}: loading activity, ${activeState}`
      : `${source.name}: ${total} activities, ${activeState}`;
    const btn = h(
      "button",
      {
        class: "sk-source" + (active ? " active" : ""),
        "aria-label": ariaLabel,
        "aria-pressed": String(active),
        onclick: () => onToggle(source.key),
      },
      [
        renderSourceIcon(source),
        h(
          "span",
          { class: "sk-source-count" },
          isLoading
            ? h("span", {
                class: "sk-skeleton sk-source-count-skeleton",
                "aria-hidden": true,
              })
            : total,
        ),
      ],
    );
    btn.addEventListener("mouseenter", (event) => tooltip.showSourceLabel(event, source));
    btn.addEventListener("mousemove", tooltip.move);
    btn.addEventListener("mouseleave", tooltip.hide);
    row.appendChild(btn);
  });
  return row;
};

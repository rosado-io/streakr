import type { ComponentCtx } from "./config";
import { h, trustedHtml } from "./dom";
import { providerIconHtml } from "./providers";
import { computeProviderTotals } from "./selectors";
import type { Tooltip } from "./tooltip";

export const renderProviderRow = (
  ctx: ComponentCtx,
  tooltip: Tooltip,
  onToggle: (key: string) => void,
  isLoading = false,
): HTMLElement => {
  const row = h("div", { class: "sk-providers" });
  const totals = computeProviderTotals(ctx);
  ctx.cfg.providers.forEach((p) => {
    const active = !!ctx.state.providers[p.key];
    const total = (totals[p.key] ?? 0).toLocaleString();
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
        onclick: () => onToggle(p.key),
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
    btn.addEventListener("mouseenter", (e) => tooltip.showProviderLabel(e, p));
    btn.addEventListener("mousemove", tooltip.move);
    btn.addEventListener("mouseleave", tooltip.hide);
    row.appendChild(btn);
  });
  return row;
};

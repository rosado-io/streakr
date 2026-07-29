import type { ComponentCtx } from "./config";
import { h } from "./dom";
import { logoR } from "./logo";
import { isCurrentYear, visibleYears, type RenderFlags } from "./selectors";
import { renderSourceRow } from "./source-row";
import type { Tooltip } from "./tooltip";

export interface HeaderActions {
  setYear: (year: number) => void;
  openYearModal: () => void;
  toggleSource: (key: string) => void;
}

const renderTitleRow = (ctx: ComponentCtx): HTMLElement => {
  const subtitleText = isCurrentYear(ctx) ? "Year to date" : String(ctx.state.year ?? "");
  return h("div", { class: "sk-title-row" }, [
    h("div", { class: "sk-brand" }, [
      h("div", { class: "sk-logo" }, [logoR()]),
      h("div", { class: "sk-title", text: "streakr" }),
      h("div", { class: "sk-subtitle", text: subtitleText }),
    ]),
  ]);
};

const buildYearTab = (
  ctx: ComponentCtx,
  actions: HeaderActions,
  year: number,
  isLoading: boolean,
): HTMLElement =>
  h("button", {
    class: "sk-year-tab" + (ctx.state.year === year ? " active" : ""),
    onclick: () => actions.setYear(year),
    disabled: isLoading || undefined,
    "aria-current": ctx.state.year === year ? "true" : undefined,
    text: String(year),
  });

const renderYearsList = (
  ctx: ComponentCtx,
  actions: HeaderActions,
  isLoading: boolean,
): HTMLElement => {
  const { visible, hasMore } = visibleYears(ctx.cfg);
  const yearIsHidden = ctx.state.year != null && !visible.includes(ctx.state.year);
  const list = h("div", { class: "sk-years-list" });
  visible.forEach((y) => list.appendChild(buildYearTab(ctx, actions, y, isLoading)));
  if (yearIsHidden && ctx.state.year != null) {
    list.appendChild(
      h("button", {
        class: "sk-year-tab active",
        "aria-current": "true",
        onclick: () => actions.openYearModal(),
        text: String(ctx.state.year),
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
          onclick: () => actions.openYearModal(),
        },
        [h("span"), h("span"), h("span")],
      ),
    );
  }
  return list;
};

const shouldRenderSourceRow = (ctx: ComponentCtx, flags: RenderFlags): boolean =>
  ctx.cfg.showSources &&
  ctx.cfg.sources.length > 0 &&
  (flags.isLoading ? ctx.cfg.sources.length > 1 : !flags.isEmpty && flags.sourcesWithDataCount > 1);

const renderYearsBar = (
  ctx: ComponentCtx,
  flags: RenderFlags,
  actions: HeaderActions,
  tooltip: Tooltip,
): HTMLElement => {
  const yearsBar = h("div", { class: "sk-years" });
  yearsBar.dataset.noSources = String(!ctx.cfg.showSources);
  yearsBar.appendChild(renderYearsList(ctx, actions, flags.isLoading));
  if (shouldRenderSourceRow(ctx, flags)) {
    yearsBar.appendChild(
      renderSourceRow(ctx, tooltip, actions.toggleSource, flags.sourceTotals, flags.isLoading),
    );
  }
  return yearsBar;
};

export const renderHeader = (
  ctx: ComponentCtx,
  flags: RenderFlags,
  actions: HeaderActions,
  tooltip: Tooltip,
): HTMLElement => {
  const header = h("div", { class: "sk-header" });
  header.appendChild(renderTitleRow(ctx));
  header.appendChild(renderYearsBar(ctx, flags, actions, tooltip));
  return header;
};

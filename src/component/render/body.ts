import type { StreakrLeveledDay } from "../../types";
import type { ComponentCtx } from "../config";
import { h, trustedHtml } from "../dom";
import type { StreakrStats } from "../metrics";
import { isCurrentYear } from "../selectors";
import type { Tooltip } from "../tooltip";
import { isMobileHeatmap, renderHeatmap, renderSkeletonHeatmap } from "./heatmap";
import type { RingRenderer } from "./ring";
import { formatActiveRate, loadingStatCard, statCard } from "./stats";

export type ReadyBody = HTMLElement & {
  __skDraw?: () => void;
  __skObserveTarget?: HTMLElement;
};

export interface BodyRenderer {
  renderLoadingBody: () => HTMLElement;
  renderReadyBody: (
    leveled: StreakrLeveledDay[],
    stats: StreakrStats,
    isRevealing: boolean,
  ) => HTMLElement;
  renderEmpty: (canEnableAll?: boolean) => HTMLElement;
  renderNoProviders: () => HTMLElement;
}

export interface BodyRendererDeps {
  tooltip: Tooltip;
  ring: RingRenderer;
  onEnableAll: () => void;
  setCurrentDraw: (draw: () => void) => void;
}

export const createBodyRenderer = (ctx: ComponentCtx, deps: BodyRendererDeps): BodyRenderer => {
  const { tooltip, ring, onEnableAll, setCurrentDraw } = deps;

  const createReadyBodyShell = (): {
    body: ReadyBody;
    heatmapWrap: HTMLElement;
    heatmapInner: HTMLElement;
  } => {
    const body = h("div", { class: "sk-body" }) as ReadyBody;
    body.dataset.noStats = String(!ctx.cfg.showStats);

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
        const svgEl = ring.renderSkeletonRing();
        heatmapInner.replaceChildren(
          h("div", { class: "sk-ring" }, [h("div", { class: "sk-ring-svg-wrap" }, [svgEl])]),
        );
      } else {
        const w = heatmapWrap.clientWidth - 32;
        const svgEl = renderSkeletonHeatmap(ctx, Math.max(200, w));
        heatmapInner.replaceChildren(h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]));
      }
    };
    body.__skDraw = draw;
    setCurrentDraw(draw);
    body.__skObserveTarget = heatmapWrap;

    if (ctx.cfg.showStats) {
      const contextualStat = isCurrentYear(ctx)
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
      onclick: () => onEnableAll(),
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
          (isCurrentYear(ctx) ? "the year to date" : String(ctx.state.year ?? "")),
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
          ring.renderRing(heatmapInner, leveled);
        } else {
          const w = heatmapWrap.clientWidth - 32;
          const ariaLabel = isCurrentYear(ctx)
            ? `Contribution heatmap for ${ctx.state.year ?? "selected year"} year to date`
            : `Contribution heatmap for ${ctx.state.year ?? "selected year"}`;
          renderHeatmap(
            heatmapInner,
            leveled,
            Math.max(200, w),
            ariaLabel,
            tooltip.bindCellEvents,
            pendingReveal ? ctx.cfg.today : undefined,
          );
        }
        pendingReveal = false;
      } catch (err) {
        console.error("[streakr] draw failed:", err);
      }
    };
    body.__skDraw = draw;
    setCurrentDraw(draw);
    body.__skObserveTarget = heatmapWrap;

    if (ctx.cfg.showStats) {
      const contextualStat = isCurrentYear(ctx)
        ? statCard("Current Streak", stats.current, " days")
        : statCard("Active Rate", formatActiveRate(stats.active, ctx.state.year), "%");
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

  return { renderLoadingBody, renderReadyBody, renderEmpty, renderNoProviders };
};

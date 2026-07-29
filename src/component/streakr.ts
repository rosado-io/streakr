import type { StreakrInstance, StreakrOptions, StreakrSourceState, StreakrUpdate } from "../types";
import { validateSelectedYear, validateSourceState } from "./contract";
import type { ComponentCtx } from "./config";
import { createInitialState, resolveConfig } from "./config";
import { h } from "./dom";
import { renderHeader, type HeaderActions } from "./header";
import { enabledSourceState, syncSourceState } from "./sources";
import { createBodyRenderer, type ReadyBody } from "./render/body";
import { createRingRenderer } from "./render/ring";
import { computeRenderFlags, type RenderFlags } from "./selectors";
import { applyAccentVars, createThemeController } from "./theme";
import { createTooltip } from "./tooltip";
import { applyUpdate } from "./update";
import { renderYearModal } from "./year-modal";

export function createStreakr(options: StreakrOptions): StreakrInstance {
  const cfg = resolveConfig(options);
  const state = createInitialState(cfg);
  const ctx: ComponentCtx = { cfg, state };

  const syncSources = (): void => {
    state.sources = syncSourceState(cfg.sources, state.sources);
  };

  const root = h("div", { class: "sk-root" }) as HTMLElement;
  cfg.target.appendChild(root);

  const tooltip = createTooltip(ctx);
  root.appendChild(tooltip.el);

  let currentDraw: (() => void) | null = null;
  let observedWrap: HTMLElement | null = null;
  let lastDrawWidth = 0;
  let wasLoading = false;
  let resizeFrame: number | null = null;
  const resizeObs = new ResizeObserver(() => {
    if (!observedWrap || resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!observedWrap) return;
      const width = observedWrap.getBoundingClientRect().width;
      if (Math.abs(width - lastDrawWidth) < 1) return;
      lastDrawWidth = width;
      currentDraw?.();
    });
  });

  const theme = createThemeController(cfg, root);

  const ring = createRingRenderer(ctx, () => resetSelectedDay());
  const body = createBodyRenderer(ctx, {
    tooltip,
    ring,
    onEnableAll: () => enableAllSources(),
    setCurrentDraw: (draw) => {
      currentDraw = draw;
    },
  });

  const headerActions: HeaderActions = {
    setYear: (y) => setYear(y),
    openYearModal: () => openYearModal(),
    toggleSource: (key) => toggleSource(key),
  };

  const resetSelectedDay = (): void => {
    state.selectedDay = cfg.today;
    render();
  };

  const appendBody = (card: Element, flags: RenderFlags, isRevealing: boolean): void => {
    const stateBody = [
      [flags.isError, body.renderError],
      [flags.isLoading, body.renderLoadingBody],
      [flags.allOff, body.renderNoSources],
      [flags.isEmpty, () => body.renderEmpty(flags.canEnableAll)],
    ].find(([matches]) => matches) as [boolean, () => HTMLElement] | undefined;

    const bodyEl = (
      stateBody ? stateBody[1]() : body.renderReadyBody(flags.leveled, flags.stats, isRevealing)
    ) as ReadyBody;
    card.appendChild(bodyEl);
    bodyEl.__skDraw?.();
    if (bodyEl.__skObserveTarget) {
      observedWrap = bodyEl.__skObserveTarget;
      lastDrawWidth = observedWrap.getBoundingClientRect().width;
      resizeObs.observe(observedWrap);
    }
  };

  const render = (): void => {
    syncSources();
    tooltip.hide();
    resizeObs.disconnect();
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    }
    currentDraw = null;
    observedWrap = null;

    const wasOpen = state.yearModalOpen;
    const flags = computeRenderFlags(ctx);
    const isRevealing = wasLoading && cfg.status === "ready";
    wasLoading = flags.isLoading;

    root.replaceChildren(tooltip.el);
    root.dataset.theme = theme.getActiveTheme();
    applyAccentVars(root, cfg.accent, cfg.tintHeatmap);

    const card = h("div", {
      class: "sk-card",
      "aria-busy": flags.isLoading ? "true" : "false",
    });
    root.appendChild(card);
    card.appendChild(renderHeader(ctx, flags, headerActions, tooltip));
    appendBody(card, flags, isRevealing);

    if (wasOpen) {
      renderYearModal(card, {
        years: cfg.years,
        currentYear: state.year,
        onSelect: (y) => setYear(y),
        onClose: () => closeYearModal(),
      });
    }
  };

  const setYear = (y: number): void => {
    state.year = validateSelectedYear(y, cfg.years);
    cfg.year = state.year;
    cfg.onYearChange?.(y);
    render();
  };

  const toggleSource = (key: string): void => {
    state.sources[key] = !state.sources[key];
    cfg.onSourceToggle?.(key, state.sources[key], { ...state.sources });
    render();
  };

  const enableAllSources = (): void => {
    state.sources = enabledSourceState(cfg.sources);
    render();
  };

  const openYearModal = (): void => {
    state.yearModalOpen = true;
    render();
    root.querySelector<HTMLButtonElement>(".sk-modal-year")?.focus();
  };

  const closeYearModal = (): void => {
    state.yearModalOpen = false;
    render();
    root.querySelector<HTMLButtonElement>(".sk-year-more")?.focus();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && state.yearModalOpen) {
      closeYearModal();
    }
  };

  document.addEventListener("keydown", onKey);
  theme.setup();
  render();

  return {
    update(patch: StreakrUpdate): void {
      applyUpdate(cfg, state, patch, { onThemeChange: () => theme.setup() });
      render();
    },
    setYear,
    setSources(next: StreakrSourceState): void {
      state.sources = { ...state.sources, ...validateSourceState(next, cfg.sources) };
      render();
    },
    destroy(): void {
      resizeObs.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      theme.cleanup();
      document.removeEventListener("keydown", onKey);
      tooltip.el.remove();
      root.remove();
    },
  };
}

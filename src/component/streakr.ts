import type { StreakrInstance, StreakrOptions, StreakrProviders } from "../types";
import type { ComponentCtx } from "./config";
import { createInitialState, resolveConfig } from "./config";
import { h } from "./dom";
import { renderHeader, type HeaderActions } from "./header";
import { enabledProviderState, syncProviderState as syncProviders } from "./providers";
import { createBodyRenderer, type ReadyBody } from "./render/body";
import { createRingRenderer } from "./render/ring";
import { computeRenderFlags, type RenderFlags } from "./selectors";
import { applyAccentVars, createThemeController } from "./theme";
import { createTooltip } from "./tooltip";
import { createUpdateHandlers, type UpdatePatch } from "./update";
import { renderYearModal } from "./year-modal";

export function createStreakr(options: StreakrOptions): StreakrInstance {
  const cfg = resolveConfig(options);
  const state = createInitialState(cfg);
  const ctx: ComponentCtx = { cfg, state };

  const syncProviderState = (): void => {
    state.providers = syncProviders(cfg.providers, state.providers);
  };

  const root = h("div", { class: "sk-root" }) as HTMLElement;
  cfg.target.appendChild(root);

  const tooltip = createTooltip(ctx);
  root.appendChild(tooltip.el);

  let currentDraw: (() => void) | null = null;
  let observedWrap: HTMLElement | null = null;
  let lastDrawWidth = 0;
  let wasLoading = false;
  // Redraw only when the wrap width actually changed since the last draw. This
  // makes the observer's initial callback a natural no-op without a skip flag,
  // which would swallow the first real resize when that callback never fires
  // (e.g. some embedded browsers, or elements without a box at observe time).
  const resizeObs = new ResizeObserver(() => {
    if (!observedWrap) {
      return;
    }
    const width = observedWrap.getBoundingClientRect().width;
    if (Math.abs(width - lastDrawWidth) < 1) {
      return;
    }
    lastDrawWidth = width;
    currentDraw?.();
  });

  const theme = createThemeController(cfg, root);

  const ring = createRingRenderer(ctx, () => resetSelectedDay());
  const body = createBodyRenderer(ctx, {
    tooltip,
    ring,
    onEnableAll: () => enableAllProviders(),
    setCurrentDraw: (draw) => {
      currentDraw = draw;
    },
  });

  const headerActions: HeaderActions = {
    setYear: (y) => setYear(y),
    openYearModal: () => openYearModal(),
    toggleProvider: (key) => toggleProvider(key),
  };

  const resetSelectedDay = (): void => {
    state.selectedDay = cfg.today;
    render();
  };

  const appendBody = (card: Element, flags: RenderFlags, isRevealing: boolean): void => {
    const stateBody = [
      [flags.isLoading, body.renderLoadingBody],
      [flags.allOff, body.renderNoProviders],
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
    syncProviderState();
    tooltip.hide();
    resizeObs.disconnect();
    currentDraw = null;
    observedWrap = null;

    const wasOpen = state.yearModalOpen;
    const flags = computeRenderFlags(ctx);
    const isRevealing = wasLoading && !flags.isLoading;
    wasLoading = flags.isLoading;

    root.replaceChildren(tooltip.el);
    root.dataset.theme = theme.getActiveTheme();
    applyAccentVars(root, cfg.accent, cfg.tintHeatmap);

    const card = h("div", { class: "sk-card" });
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
    state.year = y;
    cfg.onYearChange?.(y);
    render();
  };

  const toggleProvider = (key: string): void => {
    state.providers[key] = !state.providers[key];
    cfg.onProviderToggle?.(key, state.providers[key], { ...state.providers });
    render();
  };

  const enableAllProviders = (): void => {
    state.providers = enabledProviderState(cfg.providers);
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

  const { updateHandlers, isUpdateKey } = createUpdateHandlers(cfg, state, {
    onThemeChange: () => theme.setup(),
  });

  document.addEventListener("keydown", onKey);
  theme.setup();
  render();

  return {
    update(patch: UpdatePatch): void {
      for (const key of Object.keys(patch)) {
        if (isUpdateKey(key)) {
          updateHandlers[key](patch);
        }
      }
      render();
    },
    setYear,
    setProviders(next: StreakrProviders): void {
      state.providers = { ...state.providers, ...next };
      render();
    },
    destroy(): void {
      resizeObs.disconnect();
      theme.cleanup();
      document.removeEventListener("keydown", onKey);
      tooltip.el.remove();
      root.remove();
    },
  };
}

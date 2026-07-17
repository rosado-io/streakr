import type { ResolvedConfig } from "./config";

// Widened so the SSR/shim guards survive type-checking against DOM lib globals,
// where window and matchMedia are typed as always present.
const getWin = (): Window | undefined => globalThis.window;

const getMatchMedia = (): ((query: string) => MediaQueryList) | undefined => {
  const win = getWin();
  if (!win || typeof win.matchMedia !== "function") return undefined;
  return win.matchMedia.bind(win);
};

export interface ThemeController {
  getActiveTheme: () => "dark" | "light";
  setup: () => void;
  cleanup: () => void;
}

export const createThemeController = (cfg: ResolvedConfig, root: HTMLElement): ThemeController => {
  let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  const getActiveTheme = (): "dark" | "light" => {
    if (cfg.theme !== "system") return cfg.theme;
    const isDark = getMatchMedia()?.("(prefers-color-scheme: dark)").matches;
    return isDark ? "dark" : "light";
  };

  const cleanup = (): void => {
    const matchMedia = getMatchMedia();
    if (mediaQueryListener && matchMedia) {
      matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaQueryListener);
    }
    mediaQueryListener = null;
  };

  const setup = (): void => {
    const matchMedia = getMatchMedia();
    if (!matchMedia) return;
    cleanup();
    if (cfg.theme === "system") {
      const mediaQuery = matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (e: MediaQueryListEvent) => {
        root.dataset.theme = e.matches ? "dark" : "light";
      };
      mediaQuery.addEventListener("change", mediaQueryListener);
    }
  };

  return { getActiveTheme, setup, cleanup };
};

export const applyAccentVars = (el: HTMLElement, accent: string, tintHeatmap: boolean): void => {
  const a = accent;
  el.style.setProperty("--sk-accent", a);
  el.style.setProperty("--sk-accent-glow", a + "47");
  el.style.setProperty("--sk-accent-soft", a + "0d");
  el.style.setProperty("--sk-accent-mid", a + "8c");
  el.style.setProperty("--sk-accent-bg", a + "1a");
  if (tintHeatmap) {
    el.style.setProperty("--sk-heat-1", `color-mix(in oklab, ${a} 18%, var(--sk-heat-0))`);
    el.style.setProperty("--sk-heat-2", `color-mix(in oklab, ${a} 45%, var(--sk-heat-0))`);
    el.style.setProperty("--sk-heat-3", `color-mix(in oklab, ${a} 75%, var(--sk-heat-0))`);
    el.style.setProperty("--sk-heat-4", a);
  } else {
    ["--sk-heat-1", "--sk-heat-2", "--sk-heat-3", "--sk-heat-4"].forEach((v) =>
      el.style.removeProperty(v),
    );
  }
};

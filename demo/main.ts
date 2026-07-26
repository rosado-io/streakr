/// <reference types="vite/client" />

import "./styles.css";
import {
  AGENT_PROVIDERS,
  createStreakr,
  type StreakrInstance,
  type StreakrProvider,
  type StreakrState,
  type StreakrTheme,
} from "../src/index";
import { StreakrSampleData } from "./sample-data";
import {
  AGENT_SNIPPETS,
  INSTALL_CMD,
  INSTALL_SNIPPETS,
  highlight,
  logoSvg,
  shellHtml,
} from "./shell";

const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: "Green", value: "#39d353" },
  { label: "Blue", value: "#4f8cff" },
  { label: "Purple", value: "#a371f7" },
  { label: "Orange", value: "#fc6d26" },
  { label: "Pink", value: "#ff5d9e" },
];

const DEMO_PROVIDERS: StreakrProvider[] = [
  { key: "github", name: "GitHub", color: "#39d353" },
  { key: "gitlab", name: "GitLab", color: "#fc6d26" },
];

const root = document.getElementById("root");
if (!root) throw new Error("Landing root not found");

// Idempotent: the build already baked this exact string into index.html, so on
// a prerendered page this rewrites the shell with identical markup.
root.innerHTML = shellHtml();

document.querySelectorAll<HTMLElement>("[data-logo]").forEach((el) => {
  el.innerHTML = logoSvg(el.closest(".lv2-nav") ? 26 : 20);
});

/* ────────────────────────────────────────────────────────────
   Demo state + the two live instances
   ──────────────────────────────────────────────────────────── */

interface DemoState {
  theme: StreakrTheme;
  accent: string;
  showProviders: boolean;
  showStats: boolean;
  showAgents: boolean;
  componentState: StreakrState;
  year: number;
}

const state: DemoState = {
  theme: "dark",
  accent: "#39d353",
  showProviders: true,
  showStats: true,
  showAgents: true,
  componentState: "ready",
  year: 2026,
};

function activeProviders(): StreakrProvider[] {
  return state.showAgents ? [...DEMO_PROVIDERS, ...AGENT_PROVIDERS] : DEMO_PROVIDERS;
}

const slots: { el: HTMLElement; instance: StreakrInstance | null }[] = [];

function registerSlot(id: string): void {
  const el = document.getElementById(id);
  if (el) slots.push({ el, instance: null });
}

registerSlot("slot-desktop");
registerSlot("slot-mobile");

function mountAll(): void {
  slots.forEach((slot) => {
    slot.instance?.destroy();
    slot.el.innerHTML = "";
    slot.instance = createStreakr({
      target: slot.el,
      theme: state.theme,
      accent: state.accent,
      tintHeatmap: true,
      showProviders: state.showProviders,
      showStats: state.showStats,
      state: state.componentState,
      providers: activeProviders(),
      years: StreakrSampleData.availableYears,
      year: state.year,
      today: StreakrSampleData.today,
      getDays: StreakrSampleData.getDays,
      onYearChange: (year) => {
        state.year = year;
        syncThemedContainers();
        renderLiveCode();
        slots
          .filter((other) => other.el !== slot.el)
          .forEach((other) => other.instance?.setYear(year));
      },
    });
  });
  syncThemedContainers();
}

function updateAll(): void {
  if (slots.some((slot) => !slot.instance)) {
    mountAll();
    return;
  }
  slots.forEach((slot) => {
    slot.instance?.update({
      theme: state.theme,
      accent: state.accent,
      tintHeatmap: true,
      showProviders: state.showProviders,
      showStats: state.showStats,
      state: state.componentState,
      providers: activeProviders(),
    });
  });
  syncThemedContainers();
}

function syncThemedContainers(): void {
  // Scoped on purpose: a bare [data-theme] query would also hit the component's
  // own .sk-root, which createStreakr owns and rewrites on every render.
  document.querySelectorAll<HTMLElement>("#slot-desktop, .lv2-phone-screen").forEach((el) => {
    el.dataset.theme = state.theme;
  });
  const shell = document.querySelector<HTMLElement>(".lv2");
  if (shell) shell.style.setProperty("--lv2-accent", state.accent);
  const badge = document.querySelector<HTMLElement>("[data-device-badge]");
  if (badge) badge.textContent = `${state.year} · ring`;
}

/* ────────────────────────────────────────────────────────────
   Controls — labelled, touch-friendly, no hover-only tooltips
   ──────────────────────────────────────────────────────────── */

function controlGroup(label: string, body: HTMLElement): HTMLElement {
  const group = document.createElement("div");
  group.className = "lv2-group";
  const title = document.createElement("div");
  title.className = "lv2-group-label";
  title.textContent = label;
  group.appendChild(title);
  group.appendChild(body);
  return group;
}

function segmented<T extends string>(
  options: { label: string; value: T }[],
  current: T,
  onPick: (value: T) => void,
  mono = false,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "lv2-seg";
  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "lv2-seg-btn" + (option.value === current ? " active" : "") + (mono ? " mono" : "");
    btn.textContent = option.label;
    btn.addEventListener("click", () => onPick(option.value));
    wrap.appendChild(btn);
  });
  return wrap;
}

function switchRow(label: string, on: boolean, onToggle: () => void): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lv2-switch-row";
  btn.setAttribute("aria-pressed", String(on));
  const text = document.createElement("span");
  text.textContent = label;
  const track = document.createElement("span");
  track.className = "lv2-switch" + (on ? " on" : "");
  track.appendChild(document.createElement("span"));
  btn.appendChild(text);
  btn.appendChild(track);
  btn.addEventListener("click", onToggle);
  return btn;
}

function renderControls(): void {
  const host = document.getElementById("pg-controls");
  if (!host) return;
  host.innerHTML = "";

  host.appendChild(
    controlGroup(
      "Theme",
      segmented(
        [
          { label: "Dark", value: "dark" },
          { label: "Light", value: "light" },
        ],
        state.theme,
        (value) => {
          state.theme = value;
          updateAll();
          renderControls();
          renderLiveCode();
        },
      ),
    ),
  );

  const swatches = document.createElement("div");
  swatches.className = "lv2-swatches";
  ACCENT_PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lv2-swatch" + (preset.value === state.accent ? " active" : "");
    btn.style.background = preset.value;
    btn.title = preset.label;
    btn.setAttribute("aria-label", `Accent: ${preset.label}`);
    btn.addEventListener("click", () => {
      state.accent = preset.value;
      updateAll();
      renderControls();
      renderLiveCode();
    });
    swatches.appendChild(btn);
  });
  const custom = document.createElement("label");
  custom.className = "lv2-swatch-custom";
  custom.title = "Custom color";
  const input = document.createElement("input");
  input.type = "color";
  input.value = state.accent;
  input.addEventListener("input", (event) => {
    state.accent = (event.target as HTMLInputElement).value;
    updateAll();
    renderLiveCode();
  });
  custom.appendChild(input);
  swatches.appendChild(custom);
  host.appendChild(controlGroup("Accent", swatches));

  const options = document.createElement("div");
  options.className = "lv2-switches";
  options.appendChild(
    switchRow("Provider chips", state.showProviders, () => {
      state.showProviders = !state.showProviders;
      updateAll();
      renderControls();
      renderLiveCode();
    }),
  );
  options.appendChild(
    switchRow("Records panel", state.showStats, () => {
      state.showStats = !state.showStats;
      updateAll();
      renderControls();
      renderLiveCode();
    }),
  );
  options.appendChild(
    switchRow("AI agent sources", state.showAgents, () => {
      state.showAgents = !state.showAgents;
      updateAll();
      renderControls();
      renderLiveCode();
    }),
  );
  host.appendChild(controlGroup("Options", options));

  host.appendChild(
    controlGroup(
      "Component state",
      segmented(
        [
          { label: "ready", value: "ready" },
          { label: "loading", value: "loading" },
        ],
        state.componentState,
        (value) => {
          state.componentState = value;
          updateAll();
          renderControls();
          renderLiveCode();
        },
        true,
      ),
    ),
  );
}

/* ────────────────────────────────────────────────────────────
   Live code panel — the playground writes the snippet for you
   ──────────────────────────────────────────────────────────── */

function liveSource(): string {
  const providerImport = state.showAgents
    ? "createStreakr, DEFAULT_PROVIDERS, AGENT_PROVIDERS"
    : "createStreakr, DEFAULT_PROVIDERS";
  const providerLine = state.showAgents
    ? "  providers: [...DEFAULT_PROVIDERS, ...AGENT_PROVIDERS],"
    : "  providers: DEFAULT_PROVIDERS,";
  return [
    `import { ${providerImport} } from '@rosado-io/streakr'`,
    "import '@rosado-io/streakr/styles.css'",
    "",
    "createStreakr({",
    "  target: document.querySelector('#streakr'),",
    `  theme: '${state.theme}',`,
    `  accent: '${state.accent}',`,
    "  tintHeatmap: true,",
    `  showProviders: ${String(state.showProviders)},`,
    `  showStats: ${String(state.showStats)},`,
    `  state: '${state.componentState}',`,
    providerLine,
    `  years: [${StreakrSampleData.availableYears.join(", ")}],`,
    `  year: ${String(state.year)},`,
    "  getDays: (year) => fetchActivity(year),",
    "})",
  ].join("\n");
}

function renderLiveCode(): void {
  const el = document.getElementById("live-code");
  if (el) el.innerHTML = highlight(liveSource());
}

/* ────────────────────────────────────────────────────────────
   Code tabs + copy buttons
   ──────────────────────────────────────────────────────────── */

const activeTab: Record<string, string> = { install: "npm", agents: "github" };

function renderCodeTabs(name: "install" | "agents", snippets: Record<string, string>): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(`#${name}-tabs .lv2-tab`);
  const codeEl = document.getElementById(`${name}-code`);
  if (!codeEl) return;

  const paint = (): void => {
    const current = activeTab[name] ?? "";
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === current));
    codeEl.innerHTML = highlight(snippets[current] ?? "");
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab[name] = tab.dataset.tab ?? activeTab[name] ?? "";
      paint();
    });
  });
  paint();
}

function copyTextFor(key: string): string {
  if (key === "install") return INSTALL_CMD;
  if (key === "live") return liveSource();
  if (key === "install-tab") return INSTALL_SNIPPETS[activeTab.install ?? "npm"] ?? "";
  if (key === "agents-tab") return AGENT_SNIPPETS[activeTab.agents ?? "github"] ?? "";
  return "";
}

function flagCopied(btn: HTMLElement): void {
  const flag = btn.querySelector<HTMLElement>(".lv2-copy-flag") ?? btn;
  const original = flag.textContent;
  flag.textContent = "copied";
  btn.classList.add("copied");
  setTimeout(() => {
    flag.textContent = original;
    btn.classList.remove("copied");
  }, 1500);
}

document.querySelectorAll<HTMLElement>("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = copyTextFor(btn.dataset.copy ?? "");
    if (!text) return;
    void navigator.clipboard.writeText(text).catch(() => undefined);
    flagCopied(btn);
  });
});

/* ────────────────────────────────────────────────────────────
   Star count — fetched after first paint, never blocking
   ──────────────────────────────────────────────────────────── */

function formatStars(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

function loadStars(): void {
  void fetch(`https://api.github.com/repos/rosado-io/streakr`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { stargazers_count?: unknown } | null) => {
      const count =
        data && typeof data.stargazers_count === "number" ? data.stargazers_count : null;
      if (count == null) return;
      document.querySelectorAll<HTMLElement>("[data-real-stars]").forEach((el) => {
        el.textContent = formatStars(count);
        el.hidden = false;
      });
    })
    .catch(() => undefined);
}

/* ────────────────────────────────────────────────────────────
   Boot
   ──────────────────────────────────────────────────────────── */

mountAll();
renderControls();
renderLiveCode();
renderCodeTabs("install", INSTALL_SNIPPETS);
renderCodeTabs("agents", AGENT_SNIPPETS);
loadStars();

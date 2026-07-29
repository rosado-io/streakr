/// <reference types="vite/client" />

import "./fonts.css";
import "./styles.css";
import {
  AGENT_SOURCES,
  createStreakr,
  type StreakrInstance,
  type StreakrSource,
  type StreakrStatus,
  type StreakrTheme,
} from "../src/index";
import { StreakrSampleData } from "./sample-data";
import {
  INSTALL_CMD,
  INSTALL_SNIPPETS,
  RECIPE_SNIPPETS,
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

const DEMO_SOURCES: StreakrSource[] = [
  { key: "github", name: "GitHub", color: "#39d353" },
  { key: "gitlab", name: "GitLab", color: "#fc6d26" },
];

const root = document.getElementById("root");
if (!root) throw new Error("Landing root not found");

root.innerHTML = shellHtml();

document.querySelectorAll<HTMLElement>("[data-logo]").forEach((el) => {
  el.innerHTML = logoSvg(el.closest(".lv2-nav") ? 26 : 20);
});

interface DemoState {
  theme: StreakrTheme;
  accent: string;
  showSources: boolean;
  showStats: boolean;
  showAgents: boolean;
  componentStatus: StreakrStatus;
  year: number;
}

const state: DemoState = {
  theme: "dark",
  accent: "#39d353",
  showSources: true,
  showStats: true,
  showAgents: true,
  componentStatus: "ready",
  year: 2026,
};

function activeSources(): StreakrSource[] {
  return state.showAgents ? [...DEMO_SOURCES, ...AGENT_SOURCES] : DEMO_SOURCES;
}

function activeDays() {
  const keys = new Set(activeSources().map(({ key }) => key));
  return StreakrSampleData.days.map((day) => {
    const sources = Object.fromEntries(
      Object.entries(day.sources ?? {}).filter(([key]) => keys.has(key)),
    );
    return {
      ...day,
      count: Object.values(sources).reduce((total, count) => total + count, 0),
      sources,
    };
  });
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
      showSources: state.showSources,
      showStats: state.showStats,
      status: state.componentStatus,
      sources: activeSources(),
      years: StreakrSampleData.availableYears,
      year: state.year,
      today: StreakrSampleData.today,
      days: activeDays(),
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
      showSources: state.showSources,
      showStats: state.showStats,
      status: state.componentStatus,
      sources: activeSources(),
      days: activeDays(),
    });
  });
  syncThemedContainers();
}

function syncThemedContainers(): void {
  document.querySelectorAll<HTMLElement>("#slot-desktop, .lv2-phone-screen").forEach((el) => {
    el.dataset.theme = state.theme;
  });
  const shell = document.querySelector<HTMLElement>(".lv2");
  if (shell) shell.style.setProperty("--lv2-accent", state.accent);
  const badge = document.querySelector<HTMLElement>("[data-device-badge]");
  if (badge) badge.textContent = `${state.year} · ring`;
}

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
    switchRow("Source chips", state.showSources, () => {
      state.showSources = !state.showSources;
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
        state.componentStatus,
        (value) => {
          state.componentStatus = value;
          updateAll();
          renderControls();
          renderLiveCode();
        },
        true,
      ),
    ),
  );
}

function liveSource(): string {
  const sourceImport = state.showAgents
    ? "createStreakr, DEFAULT_SOURCES, AGENT_SOURCES"
    : "createStreakr, DEFAULT_SOURCES";
  const sourceLine = state.showAgents
    ? "  sources: [...DEFAULT_SOURCES, ...AGENT_SOURCES],"
    : "  sources: DEFAULT_SOURCES,";
  return [
    `import { ${sourceImport} } from '@rosado-io/streakr'`,
    "import '@rosado-io/streakr/styles.css'",
    "",
    "createStreakr({",
    "  target: document.querySelector('#streakr'),",
    `  theme: '${state.theme}',`,
    `  accent: '${state.accent}',`,
    "  tintHeatmap: true,",
    `  showSources: ${String(state.showSources)},`,
    `  showStats: ${String(state.showStats)},`,
    `  status: '${state.componentStatus}',`,
    sourceLine,
    `  years: [${StreakrSampleData.availableYears.join(", ")}],`,
    `  year: ${String(state.year)},`,
    "  days: activity,",
    "})",
  ].join("\n");
}

function renderLiveCode(): void {
  const el = document.getElementById("live-code");
  if (el) el.innerHTML = highlight(liveSource());
}

const activeTab: Record<string, string> = { install: "npm", recipes: "github" };

function renderCodeTabs(name: "install" | "recipes", snippets: Record<string, string>): void {
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
  if (key === "recipes-tab") return RECIPE_SNIPPETS[activeTab.recipes ?? "github"] ?? "";
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

mountAll();
renderControls();
renderLiveCode();
renderCodeTabs("install", INSTALL_SNIPPETS);
renderCodeTabs("recipes", RECIPE_SNIPPETS);
loadStars();

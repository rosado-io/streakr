import "./styles.css";
import {
  createStreakr,
  type StreakrInstance,
  type StreakrProvider,
  type StreakrState,
  type StreakrTheme,
} from "../src/index";
import { StreakrSampleData } from "./sample-data";

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

root.innerHTML = `
  <div class="lv1">
    <header class="lv1-nav">
      <div class="lv1-brand">
        <span data-logo></span>
        <span>streakr</span>
      </div>
      <nav class="lv1-nav-links">
        <a href="#playground">Playground</a>
        <a href="#install">Install</a>
      </nav>
      <a href="https://github.com/rosado-io/streakr" class="lv1-star" target="_blank" rel="noreferrer">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        <span>Star</span>
        <span class="lv1-star-count">2.4k</span>
      </a>
    </header>

    <section class="lv1-hero">
      <h1 class="lv1-h1">
        Your contributions.<br />
        <span class="lv1-h1-accent">Every platform.</span>
      </h1>
      <p class="lv1-sub">
        A drop-in heatmap component that unifies GitHub and GitLab activity.
        Themed, themable, and tiny. No build step.
      </p>
      <div class="lv1-cta">
        <a href="https://github.com/rosado-io/streakr" target="_blank" rel="noreferrer" class="lv1-btn lv1-btn-primary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Star on GitHub
        </a>
        <a href="#install" class="lv1-btn lv1-btn-ghost">
          <code>npm i @rosado-io/streakr</code>
        </a>
      </div>
    </section>

    <section class="lv1-pg-section" id="playground">
      <div class="lv1-eyebrow">
        <span class="lv1-eyebrow-dot"></span>
        Playground
      </div>
      <div class="lv1-component-slot" id="component-slot" data-theme="dark"></div>
      <div class="lv1-pg-bar">
        <div class="lv1-pg-controls" id="pg-controls"></div>
      </div>
    </section>

    <section class="lv1-install" id="install">
      <div class="lv1-eyebrow">
        <span class="lv1-eyebrow-dot"></span>
        Install
      </div>
      <div class="lv1-install-card">
        <div class="lv1-install-tabs">
          <button class="lv1-tab active">npm</button>
          <button class="lv1-tab">pnpm</button>
          <button class="lv1-tab">CDN</button>
        </div>
        <pre class="lv1-code"><code><span class="c-c"># install</span>
<span class="c-k">npm</span> install @rosado-io/streakr

<span class="c-c">// mount</span>
<span class="c-k">import</span> { createStreakr } <span class="c-k">from</span> <span class="c-s">'@rosado-io/streakr'</span>
<span class="c-k">import</span> <span class="c-s">'@rosado-io/streakr/styles.css'</span>

<span class="c-fn">createStreakr</span>({
  target: <span class="c-fn">document</span>.querySelector(<span class="c-s">'#streakr'</span>),
  theme: <span class="c-s">'dark'</span>,
  years: [2024, 2025, 2026],
  getDays: (year) =&gt; fetchActivity(year),
})</code></pre>
      </div>
    </section>

    <footer class="lv1-footer">
      <div class="lv1-footer-inner">
        <div class="lv1-brand">
          <span data-logo></span>
          <span>streakr</span>
        </div>
        <div class="lv1-footer-links">
          <a href="https://github.com/rosado-io/streakr#readme">Docs</a>
          <a href="https://github.com/rosado-io/streakr">GitHub</a>
          <a href="https://www.npmjs.com/package/@rosado-io/streakr">npm</a>
          <a href="https://github.com/rosado-io/streakr/blob/main/CHANGELOG.md">Changelog</a>
          <a href="https://github.com/rosado-io/streakr/blob/main/LICENSE">License (MIT)</a>
        </div>
      </div>
      <div class="lv1-footer-bot">
        <span>© 2026 streakr</span>
        <span>Open source · MIT</span>
      </div>
    </footer>
  </div>
`;

function logoSvg(): string {
  return `
    <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="7" y="1" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="13" y="1" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="1" y="7" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="7" y="7" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="13" y="7" width="4" height="4" rx="1" fill="#0e4429"/>
      <rect x="1" y="13" width="4" height="4" rx="1" fill="#39d353"/>
      <rect x="7" y="13" width="4" height="4" rx="1" fill="#0e4429"/>
      <rect x="13" y="13" width="4" height="4" rx="1" fill="#39d353"/>
    </svg>
  `;
}

document.querySelectorAll<HTMLElement>("[data-logo]").forEach((el) => {
  el.innerHTML = logoSvg();
});

const slot = document.getElementById("component-slot") as HTMLElement;
const controls = document.getElementById("pg-controls") as HTMLElement;

const state = {
  theme: "dark" as StreakrTheme,
  accent: "#39d353",
  showProviders: true,
  showStats: true,
  componentState: "ready" as StreakrState,
};

let instance: StreakrInstance | null = null;

function mountComponent(): void {
  if (instance) instance.destroy();
  slot.innerHTML = "";
  instance = createStreakr({
    target: slot,
    theme: state.theme,
    accent: state.accent,
    tintHeatmap: true,
    showProviders: state.showProviders,
    showStats: state.showStats,
    state: state.componentState,
    providers: DEMO_PROVIDERS,
    years: StreakrSampleData.availableYears,
    year: 2026,
    today: StreakrSampleData.today,
    getDays: StreakrSampleData.getDays,
  });
  slot.dataset.theme = state.theme;
}

function updateComponent(): void {
  if (!instance) return mountComponent();
  instance.update({
    theme: state.theme,
    accent: state.accent,
    tintHeatmap: true,
    showProviders: state.showProviders,
    showStats: state.showStats,
    state: state.componentState,
  });
  slot.dataset.theme = state.theme;
}

function renderControls(): void {
  controls.innerHTML = "";

  const themeWrap = document.createElement("span");
  themeWrap.className = "lv1-tip";
  themeWrap.dataset.tip = state.theme === "dark" ? "Light theme" : "Dark theme";
  const themeBtn = document.createElement("button");
  themeBtn.className = "lv1-fc-btn";
  themeBtn.textContent = state.theme === "dark" ? "☾" : "☀";
  themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    updateComponent();
    renderControls();
  });
  themeWrap.appendChild(themeBtn);
  controls.appendChild(themeWrap);

  controls.appendChild(makeSep());

  ACCENT_PRESETS.forEach((a) => {
    const wrap = document.createElement("span");
    wrap.className = "lv1-tip";
    wrap.dataset.tip = a.label;
    const sw = document.createElement("button");
    sw.className = "lv1-fc-swatch" + (state.accent === a.value ? " active" : "");
    sw.style.background = a.value;
    sw.addEventListener("click", () => {
      state.accent = a.value;
      updateComponent();
      renderControls();
    });
    wrap.appendChild(sw);
    controls.appendChild(wrap);
  });

  const customWrap = document.createElement("span");
  customWrap.className = "lv1-tip";
  customWrap.dataset.tip = "Custom color";
  const customLabel = document.createElement("label");
  customLabel.className = "lv1-fc-custom";
  const customInput = document.createElement("input");
  customInput.type = "color";
  customInput.value = state.accent;
  customInput.addEventListener("input", (e) => {
    state.accent = (e.target as HTMLInputElement).value;
    updateComponent();
  });
  customInput.addEventListener("change", () => {
    renderControls();
  });
  customLabel.appendChild(customInput);
  customWrap.appendChild(customLabel);
  controls.appendChild(customWrap);

  controls.appendChild(makeSep());

  controls.appendChild(
    makeToggle({
      tip: state.showProviders ? "Hide providers" : "Show providers",
      active: state.showProviders,
      svg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18M3 12h18"/></svg>',
      onClick: () => {
        state.showProviders = !state.showProviders;
        updateComponent();
        renderControls();
      },
    }),
  );

  controls.appendChild(
    makeToggle({
      tip: state.showStats ? "Hide stats" : "Show stats",
      active: state.showStats,
      svg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>',
      onClick: () => {
        state.showStats = !state.showStats;
        updateComponent();
        renderControls();
      },
    }),
  );

  controls.appendChild(makeSep());

  controls.appendChild(
    makeToggle({
      tip: state.componentState === "loading" ? "Show ready state" : "Show loading state",
      active: state.componentState === "loading",
      svg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.2-8.56"/><path d="M21 3v6h-6"/></svg>',
      onClick: () => {
        state.componentState = state.componentState === "loading" ? "ready" : "loading";
        updateComponent();
        renderControls();
      },
    }),
  );
}

function makeSep(): HTMLElement {
  const sep = document.createElement("div");
  sep.className = "lv1-fc-sep";
  return sep;
}

interface ToggleOpts {
  tip: string;
  active: boolean;
  svg: string;
  onClick: () => void;
}

function makeToggle({ tip, active, svg, onClick }: ToggleOpts): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "lv1-tip";
  wrap.dataset.tip = tip;
  const btn = document.createElement("button");
  btn.className = "lv1-fc-btn" + (active ? "" : " lv1-fc-off");
  btn.innerHTML = svg;
  btn.addEventListener("click", onClick);
  wrap.appendChild(btn);
  return wrap;
}

mountComponent();
renderControls();

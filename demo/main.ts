import "./styles.css";
import {
  buildCalendarGrid,
  computeStreaks,
  createCssVarTheme,
  renderContributionWidget,
  themes,
  type ContributionDay,
  type ContributionMetric,
  type Theme,
  type WidgetSize,
} from "../src/index";

type ThemeOption = "classic" | "dark" | "system" | "studio";

const today = new Date();
const days = generateMockSeries(196, today);
const streaks = computeStreaks(days);
const grid = buildCalendarGrid(days, {
  startDate: days[0]?.date,
  endDate: days.at(-1)?.date,
  weekStartsOn: 0,
});

const activeDays = days.filter((day) => day.count > 0).length;
const recent30Total = days.slice(-30).reduce((sum, day) => sum + day.count, 0);
const peakDay = days.reduce((best, day) => (day.count > best.count ? day : best), days[0]!);
const providerTotals = days.reduce(
  (totals, day) => {
    totals.github += day.sources?.github ?? 0;
    totals.gitlab += day.sources?.gitlab ?? 0;
    return totals;
  },
  { github: 0, gitlab: 0 },
);
const rangeLabel = formatRange(days[0]!.date, days[days.length - 1]!.date);
const widgetMetrics: ContributionMetric[] = [
  { label: "Total Contributions", value: streaks.total },
  { label: "Best Streak", value: `${streaks.bestStreak} days` },
  { label: "Current Streak", value: `${streaks.currentStreak} days` },
  { label: "Active Days", value: activeDays },
];

const themeOptions: Record<ThemeOption, Theme> = {
  classic: themes.classicGreen,
  dark: themes.dark,
  system: themes.system,
  studio: createCssVarTheme({ prefix: "playground" }),
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

app.innerHTML = `
<main class="shell">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Streakr Demo</p>
      <h1>See one streak graph across GitHub and GitLab.</h1>
      <p class="lede">
        This page ships with deterministic sample activity so
        <code>pnpm dev</code> renders immediately. It behaves like a product
        preview, not a token wall: no credentials are requested, stored, or sent
        anywhere by default.
      </p>
      <div class="hero-actions">
        <label class="control">
          <span>Theme</span>
          <select id="theme-select" aria-label="Theme">
            <option value="classic">Classic Green</option>
            <option value="dark" selected>Dark</option>
            <option value="system">System</option>
            <option value="studio">CSS Variables</option>
          </select>
        </label>
        <label class="control">
          <span>Size</span>
          <select id="size-select" aria-label="Widget size">
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg" selected>Large</option>
          </select>
        </label>
        <div class="provider-strip" aria-label="Mock providers">
          <span>GitHub mock</span>
          <span>GitLab mock</span>
          <span>Privacy-first</span>
        </div>
      </div>
    </div>
    <aside class="signal-card">
      <p>Snapshot</p>
      <strong>${recent30Total} contributions in the last 30 days</strong>
      <span
        >${describeCadence(days)} across ${activeDays} active days in this
        sample window.</span
      >
      <div class="signal-list">
        <span>Peak day: ${peakDay.date} · ${peakDay.count}</span>
        <span>GitHub share: ${providerTotals.github}</span>
        <span>GitLab share: ${providerTotals.gitlab}</span>
      </div>
    </aside>
  </section>
  <section class="dashboard">
    <div class="calendar-card">
      <div class="calendar-head">
        <div>
          <p class="section-label">Unified Activity</p>
          <h2>One contribution story across providers</h2>
          <p class="calendar-subtitle">
            Mock activity from ${rangeLabel}. Rendered as framework-agnostic SVG
            with the same theme system exposed by the library.
          </p>
        </div>
        <div class="legend" aria-label="Contribution intensity legend">
          <span>Less</span>
          <div class="legend-scale">
            <i class="legend-box level-0"></i>
            <i class="legend-box level-1"></i>
            <i class="legend-box level-2"></i>
            <i class="legend-box level-3"></i>
            <i class="legend-box level-4"></i>
          </div>
          <span>More</span>
        </div>
      </div>
      <div class="calendar-frame">
          <div
            id="calendar-target"
            class="calendar-target"
            aria-live="polite"
          ></div>
      </div>
    </div>
  </section>
</main>
`;

const themeSelect = document.querySelector<HTMLSelectElement>("#theme-select");
const sizeSelect = document.querySelector<HTMLSelectElement>("#size-select");
const calendarTarget = document.querySelector<HTMLDivElement>("#calendar-target");

if (!themeSelect || !sizeSelect || !calendarTarget) {
  throw new Error("Demo controls not found");
}

function paint(themeKey: ThemeOption, size: WidgetSize): void {
  const theme = themeOptions[themeKey];
  renderContributionWidget(calendarTarget, {
    grid,
    metrics: widgetMetrics,
    theme,
    size,
    statsPosition: "right",
  });
  document.body.dataset.theme = themeKey;
}

function paintFromControls(): void {
  paint(themeSelect.value as ThemeOption, sizeSelect.value as WidgetSize);
}

themeSelect.value = "dark";
sizeSelect.value = "lg";

themeSelect.addEventListener("change", paintFromControls);
sizeSelect.addEventListener("change", paintFromControls);

paintFromControls();

function describeCadence(series: ContributionDay[]): string {
  const recentWindow = series.slice(-14);
  const contributions = recentWindow.reduce((sum, day) => sum + day.count, 0);

  if (contributions >= 45) return "Shipping almost daily";
  if (contributions >= 24) return "Healthy weekly rhythm";
  return "Early but consistent";
}

function generateMockSeries(length: number, endDate: Date): ContributionDay[] {
  const WEEKEND = new Set([0, 6]);
  const PEAK_DAYS = new Set([2, 4]);
  const TAIL_COUNTS = [4, 3, 5, 2, 6, 4];

  return Array.from({ length }, (_, i) => {
    const offset = length - 1 - i;
    const date = shiftDate(endDate, -offset);
    const weekday = date.getUTCDay();
    const wave = (length - offset) % 9;

    let count = WEEKEND.has(weekday) ? 0 : 1 + (wave % 4);
    if (PEAK_DAYS.has(weekday)) count += 2;
    if (wave === 0 || wave === 5) count += 3;
    if ((length - offset) % 23 === 0) count = 0;
    if (offset < TAIL_COUNTS.length) count = TAIL_COUNTS[offset] ?? count;

    return {
      date: formatDate(date),
      count,
      sources: {
        github: Math.max(0, Math.ceil(count * 0.7)),
        gitlab: Math.max(0, Math.floor(count * 0.3)),
      },
    };
  });
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(startDate, endDate);
}

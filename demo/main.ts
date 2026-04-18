import "./styles.css";
import {
  buildCalendarGrid,
  computeStreaks,
  createCssVarTheme,
  renderContributionWidget,
  themes,
  type ContributionMetric,
  type Theme,
  type WidgetSize,
} from "../src/index";
import { locales, type Locale, type Messages } from "./i18n";
import { formatRange } from "./utils/dates";
import { generateMockSeries } from "./utils/mockData";
import { describeCadence } from "./utils/i18nHelpers";
import { getShellHtml } from "./components/layout";
import { detectLocale, applyText, applyHtml, applyOptionText } from "./utils/dom";

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

const themeOptions: Record<ThemeOption, Theme> = {
  classic: themes.classicGreen,
  dark: themes.dark,
  system: themes.system,
  studio: createCssVarTheme({ prefix: "playground" }),
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = getShellHtml();

const themeSelect = document.querySelector<HTMLSelectElement>("#theme-select");
const sizeSelect = document.querySelector<HTMLSelectElement>("#size-select");
const localeSelect = document.querySelector<HTMLSelectElement>("#locale-select");
const calendarTarget = document.querySelector<HTMLDivElement>("#calendar-target");

if (!themeSelect || !sizeSelect || !localeSelect || !calendarTarget) {
  throw new Error("Demo controls not found");
}

let currentLocale: Locale = detectLocale();

function applyLocale(locale: Locale): void {
  currentLocale = locale;
  localStorage.setItem("streakr-locale", locale);
  const msg = locales[locale];

  applyText("eyebrow", msg.eyebrow);
  applyText("heroHeading", msg.heroHeading);
  applyText("labelTheme", msg.labelTheme);
  applyText("labelSize", msg.labelSize);
  applyText("labelLanguage", msg.labelLanguage);
  applyText("badgeGithub", msg.badgeGithub);
  applyText("badgeGitlab", msg.badgeGitlab);
  applyText("badgePrivacy", msg.badgePrivacy);
  applyText("snapshotTitle", msg.snapshotTitle);
  applyText("snapshotStrong", msg.snapshotStrong(recent30Total));
  applyText(
    "snapshotCadence",
    `${describeCadence(days, msg)} ${msg.snapshotCadenceSuffix(activeDays)}`,
  );
  applyText("snapshotPeak", msg.snapshotPeak(peakDay.date, peakDay.count));
  applyText("snapshotGithub", msg.snapshotGithub(providerTotals.github));
  applyText("snapshotGitlab", msg.snapshotGitlab(providerTotals.gitlab));
  applyText("sectionLabel", msg.sectionLabel);
  applyText("calendarHeading", msg.calendarHeading);
  applyText("calendarSubtitle", msg.calendarSubtitle(rangeLabel));
  applyText("legendLess", msg.legendLess);
  applyText("legendMore", msg.legendMore);

  applyHtml("heroParagraph", msg.heroParagraph);

  applyOptionText(themeSelect, "classic", msg.optionClassicGreen);
  applyOptionText(themeSelect, "dark", msg.optionDark);
  applyOptionText(themeSelect, "system", msg.optionSystem);
  applyOptionText(themeSelect, "studio", msg.optionCssVars);
  applyOptionText(sizeSelect, "sm", msg.optionSmall);
  applyOptionText(sizeSelect, "md", msg.optionMedium);
  applyOptionText(sizeSelect, "lg", msg.optionLarge);

  document.documentElement.lang = locale;
}

function buildMetrics(msg: Messages): ContributionMetric[] {
  return [
    {
      label: msg.snapshotTitle === "Snapshot" ? "Total Contributions" : "Contribuciones totales",
      value: streaks.total,
    },
    {
      label: msg.snapshotTitle === "Snapshot" ? "Best Streak" : "Mejor racha",
      value: `${streaks.bestStreak} days`,
    },
    {
      label: msg.snapshotTitle === "Snapshot" ? "Current Streak" : "Racha actual",
      value: `${streaks.currentStreak} days`,
    },
    { label: msg.snapshotTitle === "Snapshot" ? "Active Days" : "Días activos", value: activeDays },
  ];
}

function paint(themeKey: ThemeOption, size: WidgetSize): void {
  const theme = themeOptions[themeKey];
  const msg = locales[currentLocale];
  renderContributionWidget(calendarTarget, {
    grid,
    metrics: buildMetrics(msg),
    theme,
    size,
    statsPosition: "right",
  });
  document.body.dataset.theme = themeKey;
}

function paintFromControls(): void {
  paint(themeSelect.value as ThemeOption, sizeSelect.value as WidgetSize);
}

themeSelect.addEventListener("change", paintFromControls);
sizeSelect.addEventListener("change", paintFromControls);
localeSelect.addEventListener("change", () => {
  applyLocale(localeSelect.value as Locale);
  paintFromControls();
});

themeSelect.value = "dark";
sizeSelect.value = "lg";
localeSelect.value = currentLocale;

applyLocale(currentLocale);
paintFromControls();

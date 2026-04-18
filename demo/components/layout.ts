import { localeMeta, type Locale } from "../i18n";

export function getShellHtml(): string {
  return `
<main class="shell">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow" data-i18n="eyebrow"></p>
      <h1 data-i18n="heroHeading"></h1>
      <p class="lede" data-i18n-html="heroParagraph"></p>
      <div class="hero-actions">
        <label class="control">
          <span data-i18n="labelLanguage"></span>
          <select id="locale-select" aria-label="Language">
            ${(Object.keys(localeMeta) as Locale[])
              .map(
                (loc) =>
                  `<option value="${loc}">${localeMeta[loc].flag} ${localeMeta[loc].label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="control">
          <span data-i18n="labelTheme"></span>
          <select id="theme-select" aria-label="Theme">
            <option value="classic" data-i18n="optionClassicGreen"></option>
            <option value="dark" selected data-i18n="optionDark"></option>
            <option value="system" data-i18n="optionSystem"></option>
            <option value="studio" data-i18n="optionCssVars"></option>
          </select>
        </label>
        <label class="control">
          <span data-i18n="labelSize"></span>
          <select id="size-select" aria-label="Widget size">
            <option value="sm" data-i18n="optionSmall"></option>
            <option value="md" data-i18n="optionMedium"></option>
            <option value="lg" selected data-i18n="optionLarge"></option>
          </select>
        </label>
      </div>
    </div>
    <aside class="signal-card">
      <p data-i18n="snapshotTitle"></p>
      <strong data-i18n="snapshotStrong"></strong>
      <span data-i18n="snapshotCadence"></span>
      <div class="signal-list">
        <span data-i18n="snapshotPeak"></span>
        <span data-i18n="snapshotGithub"></span>
        <span data-i18n="snapshotGitlab"></span>
      </div>
    </aside>
  </section>
  <section class="dashboard">
    <div class="calendar-card">
      <div class="calendar-head">
        <div>
          <p class="section-label" data-i18n="sectionLabel"></p>
          <h2 data-i18n="calendarHeading"></h2>
          <p class="calendar-subtitle" data-i18n="calendarSubtitle"></p>
        </div>
        <div class="legend" aria-label="Contribution intensity legend">
          <span data-i18n="legendLess"></span>
          <div class="legend-scale">
            <i class="legend-box level-0"></i>
            <i class="legend-box level-1"></i>
            <i class="legend-box level-2"></i>
            <i class="legend-box level-3"></i>
            <i class="legend-box level-4"></i>
          </div>
          <span data-i18n="legendMore"></span>
        </div>
      </div>
      <div class="calendar-frame">
        <div id="calendar-target" class="calendar-target" aria-live="polite"></div>
      </div>
    </div>
  </section>
</main>
`;
}

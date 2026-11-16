import type { StreakrDay, StreakrSource } from "../src/index";

/** The application owns this panel; Streakr only supplies the selection. */
export function renderDayDetail(day: StreakrDay | null, sources: readonly StreakrSource[]): void {
  const host = document.getElementById("day-detail");
  if (!host) return;
  const heading = document.createElement("h3");
  heading.id = "day-detail-title";
  heading.textContent = day
    ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${day.date}T00:00:00Z`),
      )
    : "Every day has a story.";
  const label = document.createElement("p");
  label.className = "lv2-detail-eyebrow";
  label.textContent = "DAY EXPLORER · SAMPLE ACTIVITY";
  const summary = document.createElement("div");
  summary.className = "lv2-detail-summary";
  summary.append(label, heading);
  const hint = document.createElement("p");
  hint.className = "lv2-detail-hint";
  hint.textContent = day
    ? "Activity from the selected calendar’s enabled sources."
    : "Select a day in either calendar. Use arrow keys to explore, or drag the ring and release.";
  summary.append(hint);
  const content = document.createElement("div");
  content.className = "lv2-detail-content";
  if (day) {
    const total = document.createElement("p");
    total.className = "lv2-detail-total";
    const count = document.createElement("strong");
    count.textContent = day.count.toLocaleString("en");
    total.append(
      count,
      document.createTextNode(day.count === 1 ? " contribution" : " contributions"),
    );
    content.append(total);
    const list = document.createElement("ul");
    list.className = "lv2-detail-sources";
    sources.forEach((source) => {
      const count = day.sources?.[source.key] ?? 0;
      if (!count) return;
      const row = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = source.name;
      const value = document.createElement("span");
      value.textContent = String(count);
      row.append(name, value);
      list.append(row);
    });
    content.append(list);
    if (day.count === 0) {
      const empty = document.createElement("p");
      empty.className = "lv2-detail-hint";
      empty.textContent = "No activity for this day with the current filters.";
      content.append(empty);
    }
  } else {
    const placeholder = document.createElement("p");
    placeholder.className = "lv2-detail-placeholder";
    placeholder.textContent = "Choose a day ↗";
    content.append(placeholder);
  }
  host.replaceChildren(summary, content);
}

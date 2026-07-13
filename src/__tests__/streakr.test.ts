import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStreakr } from "../component/streakr";
import type { StreakrDay, StreakrInstance, StreakrProvider } from "../types";

function makeYearDays(year: number, fillEvery = 3): StreakrDay[] {
  const days: StreakrDay[] = [];
  const cur = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  let i = 0;
  while (cur <= end) {
    const fill = i % fillEvery === 0;
    days.push({
      date: new Date(cur),
      total: fill ? 3 : 0,
      sources: fill ? { github: 2, gitlab: 1, bitbucket: 0 } : {},
    });
    cur.setDate(cur.getDate() + 1);
    i++;
  }
  return days;
}

describe("createStreakr", () => {
  let target: HTMLDivElement;
  let instance: StreakrInstance | null = null;
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;
  const years = [2022, 2023, 2024, 2025, 2026];
  const getDays = (year: number) => makeYearDays(year);

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const original = originalGetBoundingClientRect.call(this);
      return { ...original, width: 1024 } as DOMRect;
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20));
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    instance?.destroy();
    instance = null;
    target.remove();
    document.body.querySelectorAll(".sk-tooltip, .sk-root").forEach((el) => el.remove());
    vi.useRealTimers();
  });

  describe("mount", () => {
    it("throws when target is missing", () => {
      expect(() =>
        createStreakr({
          // @ts-expect-error — intentionally invalid
          target: null,
          years,
          getDays,
        }),
      ).toThrow(/`target` is required/);
    });

    it("mounts an .sk-root element inside target", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-root")).toBeTruthy();
    });

    it("renders a card and a header inside root", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-root .sk-card")).toBeTruthy();
      expect(target.querySelector(".sk-root .sk-header")).toBeTruthy();
    });

    it("appends a tooltip element inside the root", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-root > .sk-tooltip")).toBeTruthy();
    });

    it("applies the theme dataset attribute", () => {
      instance = createStreakr({ target, theme: "light", years, getDays });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.dataset.theme).toBe("light");
    });

    it("defaults theme to dark", () => {
      instance = createStreakr({ target, years, getDays });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.dataset.theme).toBe("dark");
    });

    it("handles theme: 'system' auto-detection", () => {
      const originalMatchMedia = window.matchMedia;
      const mockMatches = vi.fn().mockReturnValue(true);
      window.matchMedia = vi.fn().mockImplementation(
        (query) =>
          ({
            matches: mockMatches(),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as unknown as MediaQueryList,
      );

      instance = createStreakr({ target, theme: "system", years, getDays });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.dataset.theme).toBe("dark");

      mockMatches.mockReturnValue(false);
      instance.update({ theme: "system" });
      expect(root?.dataset.theme).toBe("light");

      window.matchMedia = originalMatchMedia;
    });

    it("applies accent CSS variables on the root", () => {
      instance = createStreakr({ target, accent: "#ff00aa", years, getDays });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.style.getPropertyValue("--sk-accent")).toBe("#ff00aa");
    });

    it("removes heat vars when tintHeatmap is false", () => {
      instance = createStreakr({
        target,
        accent: "#abcdef",
        tintHeatmap: false,
        years,
        getDays,
      });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.style.getPropertyValue("--sk-heat-4")).toBe("");
    });

    it("uses the last entry of `years` when `year` is omitted", () => {
      instance = createStreakr({ target, years: [2022, 2023, 2024], getDays });
      const subtitle = target.querySelector(".sk-subtitle");
      expect(subtitle?.textContent).toBe("2024");
    });

    it("labels the actual current year as year to date", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("Year to date");
    });

    it("renders the explicit year as plain number when not the latest", () => {
      instance = createStreakr({
        target,
        years: [2022, 2023, 2024, 2025, 2026],
        year: 2024,
        getDays,
      });
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("2024");
    });
  });

  describe("year tabs", () => {
    it("renders one tab per visible year", () => {
      instance = createStreakr({ target, years, getDays });
      const tabs = target.querySelectorAll(".sk-year-tab");
      expect(tabs).toHaveLength(5);
    });

    it("marks the active year with .active", () => {
      instance = createStreakr({ target, years, year: 2024, getDays });
      const active = target.querySelector(".sk-year-tab.active");
      expect(active?.textContent).toBe("2024");
    });

    it("renders a 'more' button when years exceed MAX_VISIBLE_YEARS", () => {
      const many = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
      instance = createStreakr({ target, years: many, getDays });
      expect(target.querySelector(".sk-year-more")).toBeTruthy();
    });

    it("clicking a year tab switches active year and fires onYearChange", () => {
      const onYearChange = vi.fn();
      instance = createStreakr({ target, years, year: 2026, getDays, onYearChange });
      const tab2024 = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-year-tab")).find(
        (b) => b.textContent === "2024",
      );
      tab2024?.click();
      expect(onYearChange).toHaveBeenCalledWith(2024);
      const newActive = target.querySelector(".sk-year-tab.active");
      expect(newActive?.textContent).toBe("2024");
    });

    it("renders a hidden-year pseudo tab when current year is not in the visible window", () => {
      const many = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018];
      instance = createStreakr({ target, years: many, year: 2010, getDays });
      const active = target.querySelector(".sk-year-tab.active");
      expect(active?.textContent).toBe("2010");
    });
  });

  describe("year modal", () => {
    const many = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

    it("opens when the 'more' button is clicked", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      expect(target.querySelector(".sk-modal")).toBeTruthy();
    });

    it("renders a button per year inside the modal", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      const cells = target.querySelectorAll(".sk-modal-year");
      expect(cells).toHaveLength(many.length);
    });

    it("closes when Escape is pressed", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(target.querySelector(".sk-modal")).toBeNull();
    });

    it("closes when the overlay is clicked", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      target.querySelector<HTMLElement>(".sk-modal-overlay")?.click();
      expect(target.querySelector(".sk-modal")).toBeNull();
    });

    it("clicking the close button dismisses the modal", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      target.querySelector<HTMLButtonElement>(".sk-modal-close")?.click();
      expect(target.querySelector(".sk-modal")).toBeNull();
    });

    it("picking a year from the modal switches active year", () => {
      instance = createStreakr({ target, years: many, year: 2026, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      const buttons = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-modal-year"));
      const target2020 = buttons.find((b) => b.textContent?.startsWith("2020"));
      target2020?.click();
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2020");
    });
  });

  describe("providers", () => {
    it("renders the three default chips", () => {
      instance = createStreakr({ target, years, getDays });
      const chips = target.querySelectorAll(".sk-provider");
      expect(chips).toHaveLength(3);
    });

    it("hides chips when showProviders is false", () => {
      instance = createStreakr({ target, years, showProviders: false, getDays });
      expect(target.querySelector(".sk-providers")).toBeNull();
    });

    it("toggles a provider on click and fires onProviderToggle", () => {
      const onProviderToggle = vi.fn();
      instance = createStreakr({ target, years, getDays, onProviderToggle });
      const githubChip = target.querySelector<HTMLButtonElement>(".sk-provider");
      githubChip?.click();
      expect(onProviderToggle).toHaveBeenCalledTimes(1);
      const [key, enabled, allState] = onProviderToggle.mock.calls[0];
      expect(key).toBe("github");
      expect(enabled).toBe(false);
      expect(allState).toMatchObject({ github: false });
    });

    it("renders custom providers and ignores the built-ins", () => {
      const custom: StreakrProvider[] = [
        { key: "gitea", name: "Gitea", color: "#609926" },
        { key: "forgejo", name: "Forgejo", color: "#d97706" },
      ];
      instance = createStreakr({
        target,
        years,
        providers: custom,
        getDays: (y) => [
          {
            date: new Date(y, 0, 5),
            total: 4,
            sources: { gitea: 3, forgejo: 1 },
          },
        ],
      });
      const chips = target.querySelectorAll(".sk-provider");
      expect(chips).toHaveLength(2);
      expect(chips[0].getAttribute("title")).toContain("Gitea");
      expect(chips[1].getAttribute("title")).toContain("Forgejo");
    });

    it("renders a custom icon when supplied", () => {
      const custom: StreakrProvider[] = [
        {
          key: "linear",
          name: "Linear",
          color: "#5e6ad2",
          icon: '<svg data-test="custom-icon"></svg>',
        },
        { key: "jira", name: "Jira", color: "#0052cc" },
      ];
      instance = createStreakr({
        target,
        years,
        providers: custom,
        getDays: (y) => [{ date: new Date(y, 0, 5), total: 2, sources: { linear: 1, jira: 1 } }],
      });
      expect(target.querySelector(".sk-provider [data-test='custom-icon']")).toBeTruthy();
    });

    it("falls back to the color dot when no built-in icon exists and none supplied", () => {
      const custom: StreakrProvider[] = [
        { key: "gitea", name: "Gitea", color: "#609926" },
        { key: "forgejo", name: "Forgejo", color: "#d97706" },
      ];
      instance = createStreakr({
        target,
        years,
        providers: custom,
        getDays: (y) => [{ date: new Date(y, 0, 5), total: 2, sources: { gitea: 1, forgejo: 1 } }],
      });
      const iconWrap = target.querySelector<HTMLElement>(".sk-provider-icon");
      // happy-dom preserves the literal hex; jsdom would normalize to rgb()
      expect(iconWrap?.style.background.toLowerCase()).toContain("#609926");
    });

    it("hides the chip row when only one provider has contributions (issue #84)", () => {
      instance = createStreakr({
        target,
        years,
        getDays: (y) => [
          { date: new Date(y, 0, 5), total: 3, sources: { github: 3 } },
          { date: new Date(y, 1, 1), total: 2, sources: { github: 2 } },
        ],
      });
      expect(target.querySelector(".sk-providers")).toBeNull();
      expect(target.querySelectorAll(".sk-provider")).toHaveLength(0);
    });

    it("shows the chip row when ≥2 providers have contributions", () => {
      instance = createStreakr({
        target,
        years,
        getDays: (y) => [{ date: new Date(y, 0, 5), total: 3, sources: { github: 2, gitlab: 1 } }],
      });
      expect(target.querySelector(".sk-providers")).toBeTruthy();
      expect(target.querySelectorAll(".sk-provider")).toHaveLength(3);
    });

    it("recomputes chip-row visibility when the year changes", () => {
      instance = createStreakr({
        target,
        years: [2024, 2025],
        year: 2024,
        getDays: (y) =>
          y === 2024
            ? [{ date: new Date(2024, 0, 5), total: 3, sources: { github: 2, gitlab: 1 } }]
            : [{ date: new Date(2025, 0, 5), total: 2, sources: { github: 2 } }],
      });
      expect(target.querySelector(".sk-providers")).toBeTruthy();
      const tab2025 = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-year-tab")).find(
        (b) => b.textContent === "2025",
      );
      tab2025?.click();
      expect(target.querySelector(".sk-providers")).toBeNull();
    });

    it("renders the no-providers state when all are disabled", () => {
      instance = createStreakr({ target, years, getDays });
      instance.setProviders({ github: false, gitlab: false, bitbucket: false });
      expect(target.querySelector(".sk-noprov")).toBeTruthy();
    });

    it("'Enable all' button restores all providers", () => {
      instance = createStreakr({ target, years, getDays });
      instance.setProviders({ github: false, gitlab: false, bitbucket: false });
      const enable = Array.from(
        target.querySelectorAll<HTMLButtonElement>(".sk-noprov button"),
      ).find((b) => b.textContent === "Enable all");
      enable?.click();
      expect(target.querySelector(".sk-noprov")).toBeNull();
      expect(target.querySelectorAll(".sk-provider.active")).toHaveLength(3);
    });
  });

  describe("ready body", () => {
    it("renders 4 stat cards by default", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelectorAll(".sk-stat")).toHaveLength(4);
    });

    it("hides stats when showStats is false", () => {
      instance = createStreakr({ target, years, showStats: false, getDays });
      expect(target.querySelector(".sk-stats")).toBeNull();
    });

    it("shows Current Streak for the current year", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.textContent).toContain("Current Streak");
      expect(target.textContent).not.toContain("Active Rate");
    });

    it("shows Active Rate instead of Current Streak for historical years", () => {
      const historicalDays: StreakrDay[] = [
        { date: new Date(2025, 0, 1), total: 1, sources: { github: 1 } },
        { date: new Date(2025, 0, 2), total: 0, sources: {} },
        { date: new Date(2025, 0, 3), total: 2, sources: { github: 1, gitlab: 1 } },
        { date: new Date(2025, 0, 4), total: 0, sources: {} },
      ];
      instance = createStreakr({
        target,
        years: [2025, 2026],
        year: 2025,
        getDays: () => historicalDays,
      });

      expect(target.textContent).toContain("Active Rate");
      expect(target.textContent).toContain("0.5%");
      expect(target.textContent).not.toContain("Current Streak");
      expect(target.querySelectorAll(".sk-stat")).toHaveLength(4);
    });

    it("renders a heatmap SVG", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-heatmap-svg")).toBeTruthy();
    });

    it("renders the current-year heatmap with a full-year footprint", () => {
      const fullYear = makeYearDays(2025);
      const cutoff = new Date(2026, 4, 10);
      const partialYear = makeYearDays(2026).filter((d) => d.date <= cutoff);
      const partialGetDays = (year: number) => (year === 2026 ? partialYear : fullYear);
      instance = createStreakr({
        target,
        years: [2025, 2026],
        year: 2025,
        today: new Date(2026, 4, 10),
        getDays: partialGetDays,
      });
      const fullCols = target.querySelectorAll(".sk-heatmap-svg > g > g").length;
      instance.setYear(2026);
      const currentCols = target.querySelectorAll(".sk-heatmap-svg > g > g").length;
      const currentCells = target.querySelectorAll("rect.sk-heatmap-cell").length;
      expect(currentCols).toBe(fullCols);
      expect(currentCells).toBe(365);
      expect(fullCols).toBeGreaterThanOrEqual(52);
      expect(fullCols).toBeLessThanOrEqual(54);
    });

    it("excludes prior-year days from the current year", () => {
      const today = new Date(2026, 0, 15);
      const priorYearDay: StreakrDay = {
        date: new Date(2025, 11, 25),
        total: 3,
        sources: { github: 3 },
      };
      const currentYearDay: StreakrDay = {
        date: new Date(2026, 0, 5),
        total: 5,
        sources: { github: 5 },
      };
      instance = createStreakr({
        target,
        years: [2025, 2026],
        year: 2026,
        today,
        getDays: (year) => (year === 2026 ? [currentYearDay] : [priorYearDay]),
      });

      const statValues = target.querySelectorAll<HTMLElement>(".sk-stat-value");
      expect(statValues[0].textContent?.trim()).toBe("5");
    });

    it("renders total-only days when sources are omitted", () => {
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 15),
        getDays: (year) => (year === 2026 ? [{ date: new Date(2026, 0, 5), total: 4 }] : []),
      });

      expect(target.querySelector(".sk-empty")).toBeNull();
      expect(target.textContent).toContain("4");
      expect(target.textContent).toContain("Total Contributions");
    });

    it("keeps total-only days visible when all providers are disabled", () => {
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 15),
        getDays: (year) => (year === 2026 ? [{ date: new Date(2026, 0, 5), total: 4 }] : []),
      });

      instance.setProviders({ github: false, gitlab: false, bitbucket: false });

      expect(target.querySelector(".sk-noprov")).toBeNull();
      expect(target.querySelector(".sk-empty")).toBeNull();
      expect(target.textContent).toContain("4");
      expect(target.textContent).toContain("Total Contributions");
    });

    it("excludes prior-year days from current-year provider chip totals", () => {
      const today = new Date(2026, 0, 15);
      instance = createStreakr({
        target,
        years: [2025, 2026],
        year: 2026,
        today,
        getDays: (year) =>
          year === 2026
            ? [{ date: new Date(2026, 0, 5), total: 12, sources: { github: 5, gitlab: 7 } }]
            : [{ date: new Date(2025, 11, 25), total: 5, sources: { github: 3, gitlab: 2 } }],
      });

      const counts = Array.from(target.querySelectorAll(".sk-provider-count")).map(
        (el) => el.textContent,
      );
      expect(counts).toEqual(["5", "7", "0"]);
    });

    it("does not let future days reset the Current Streak stat", () => {
      const days: StreakrDay[] = [];
      for (let i = 0; i < 5; i++) {
        days.push({
          date: new Date(2026, 0, 1 + i),
          total: 2,
          sources: { github: 2 },
        });
      }
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => days,
      });
      const statValues = target.querySelectorAll<HTMLElement>(".sk-stat-value");
      const currentStreak = statValues[2]?.textContent ?? "";
      expect(currentStreak.trim().startsWith("5")).toBe(true);
    });

    it("renders the Less/More legend with 5 swatches", () => {
      instance = createStreakr({ target, years, getDays });
      const swatches = target.querySelectorAll(".sk-legend-sq");
      expect(swatches).toHaveLength(5);
      expect(target.querySelector(".sk-legend")?.textContent).toContain("Less");
      expect(target.querySelector(".sk-legend")?.textContent).toContain("More");
    });

    it("applies the enter animation class and staggered animationDelay on first paint", () => {
      instance = createStreakr({ target, years, getDays });
      const cells = target.querySelectorAll<SVGRectElement>("rect.sk-heatmap-cell--enter");
      expect(cells.length).toBeGreaterThan(0);
      const first = cells[0];
      expect(first.getAttribute("class")).toContain("sk-heatmap-cell--enter");
      expect(first.style.animationDelay).not.toBe("");
    });

    it("does not re-apply the enter animation on update() re-render", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector("rect.sk-heatmap-cell--enter")).toBeTruthy();

      instance.update({ theme: "light" });

      expect(target.querySelector("rect.sk-heatmap-cell--enter")).toBeNull();
      const cells = target.querySelectorAll<SVGRectElement>("rect.sk-heatmap-cell");
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0].style.animationDelay).toBe("");
    });

    it("re-applies the enter animation on the loading→ready transition", () => {
      instance = createStreakr({ target, years, state: "loading", getDays });
      expect(target.querySelector("rect.sk-heatmap-cell--enter")).toBeNull();

      instance.update({ state: "ready" });

      const cells = target.querySelectorAll<SVGRectElement>("rect.sk-heatmap-cell--enter");
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0].style.animationDelay).not.toBe("");
    });
  });

  describe("lifecycle states", () => {
    it("renders the loading skeleton when state='loading'", () => {
      instance = createStreakr({ target, years, state: "loading", getDays });
      expect(target.querySelector(".sk-heatmap-svg--skeleton")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-stage > .sk-heatmap-svg-wrap")).toBeTruthy();
      expect(target.querySelector(".sk-legend")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-svg")).toBeTruthy();
      expect(target.querySelectorAll(".sk-provider")).toHaveLength(3);
      expect(target.querySelectorAll(".sk-provider-count .sk-skeleton")).toHaveLength(3);
      expect(target.querySelectorAll(".sk-stat")).toHaveLength(4);
      expect(target.textContent).toContain("Total Contributions");
      expect(target.textContent).toContain("Best Streak");
      expect(target.textContent).toContain("Current Streak");
      expect(target.textContent).toContain("Active Days");
      expect(target.querySelectorAll(".sk-stat-label .sk-skeleton")).toHaveLength(0);
      expect(target.querySelectorAll(".sk-stat-value .sk-skeleton")).toHaveLength(4);
      expect(target.querySelectorAll(".sk-stat-value-skeleton--3")).toHaveLength(1);
      expect(target.querySelectorAll(".sk-stat-value-skeleton--2")).toHaveLength(3);
      expect(target.textContent).not.toContain("Loading");
    });

    it("keeps heatmap geometry stable between ready and loading", () => {
      const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
      const monthLabels = new Set(
        Array.from({ length: 12 }, (_, month) => monthFormatter.format(new Date(2026, month, 1))),
      );
      const heatmapSnapshot = () => {
        const svg = target.querySelector<SVGSVGElement>(".sk-heatmap-svg");
        const columns = Array.from(svg?.querySelectorAll(":scope > g > g") ?? []);
        const months = Array.from(svg?.querySelectorAll("text") ?? [])
          .filter((label) => monthLabels.has(label.textContent ?? ""))
          .map((label) => `${label.textContent}:${label.getAttribute("x")}`);
        return {
          width: svg?.getAttribute("width"),
          height: svg?.getAttribute("height"),
          viewBox: svg?.getAttribute("viewBox"),
          firstColumn: columns[0]?.getAttribute("transform"),
          lastColumn: columns[columns.length - 1]?.getAttribute("transform"),
          months,
        };
      };

      instance = createStreakr({ target, years: [2026], year: 2026, getDays });
      const ready = heatmapSnapshot();
      instance.update({ state: "loading" });

      expect(heatmapSnapshot()).toEqual(ready);
    });

    it("renders the empty illustration when state='empty'", () => {
      instance = createStreakr({ target, years, state: "empty", getDays });
      expect(target.querySelector(".sk-empty")).toBeTruthy();
    });

    it("renders the empty illustration when there are zero contributions", () => {
      instance = createStreakr({
        target,
        years,
        getDays: () => [{ date: new Date(2026, 0, 1), total: 0, sources: {} }],
      });
      expect(target.querySelector(".sk-empty")).toBeTruthy();
    });

    it("renders the empty illustration when no years are available", () => {
      const getEmptyDays = vi.fn(() => []);
      instance = createStreakr({
        target,
        years: [],
        getDays: getEmptyDays,
      });

      expect(target.querySelector(".sk-empty")).toBeTruthy();
      expect(getEmptyDays).not.toHaveBeenCalled();
    });
  });

  describe("tooltip", () => {
    it("appears on cell mouseenter for a non-empty cell", () => {
      instance = createStreakr({ target, years, getDays });
      const cells = target.querySelectorAll<SVGRectElement>("rect.sk-heatmap-cell");
      const cell = cells[3];
      cell.dispatchEvent(new MouseEvent("mouseenter", { clientX: 50, clientY: 50 }));
      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.classList.contains("visible")).toBe(true);
    });

    it("hides on cell mouseleave", () => {
      instance = createStreakr({ target, years, getDays });
      const cell = target.querySelector<SVGRectElement>("rect.sk-heatmap-cell");
      expect(cell).toBeTruthy();
      cell?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 50, clientY: 50 }));
      cell?.dispatchEvent(new MouseEvent("mouseleave"));
      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.classList.contains("visible")).toBe(false);
    });

    it("hides at the start of every render", () => {
      instance = createStreakr({ target, years, getDays });
      const cell = target.querySelector<SVGRectElement>("rect.sk-heatmap-cell");
      expect(cell).toBeTruthy();
      cell?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 10, clientY: 10 }));
      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.classList.contains("visible")).toBe(true);
      instance.setYear(years[0]);
      expect(tooltip?.classList.contains("visible")).toBe(false);
    });

    it("only lists enabled providers in tooltip rows", () => {
      instance = createStreakr({
        target,
        years: [2026],
        today: new Date(2026, 0, 1),
        getDays: () => [
          {
            date: new Date(2026, 0, 1),
            total: 7,
            sources: { github: 2, gitlab: 5 },
          },
        ],
      });

      instance.setProviders({ gitlab: false });

      const cells = Array.from(target.querySelectorAll<SVGRectElement>("rect.sk-heatmap-cell"));
      const cell = cells.find(
        (c) =>
          c.getAttribute("fill")?.includes("--sk-heat-") &&
          !c.getAttribute("fill")?.includes("--sk-heat-0"),
      );
      expect(cell).toBeTruthy();
      cell?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 10, clientY: 10 }));

      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.textContent).toContain("2 contributions");
      expect(tooltip?.textContent).toContain("GitHub");
      expect(tooltip?.textContent).not.toContain("GitLab");
    });
  });

  describe("instance API", () => {
    it("update() applies a partial patch", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({ theme: "light" });
      expect(target.querySelector<HTMLElement>(".sk-root")?.dataset.theme).toBe("light");
    });

    it("update() ignores undefined values for every option", () => {
      const onYearChange = vi.fn();
      const onProviderToggle = vi.fn();
      instance = createStreakr({
        target,
        years,
        year: 2026,
        theme: "dark",
        accent: "#123456",
        tintHeatmap: true,
        showProviders: true,
        showStats: true,
        state: "ready",
        today: new Date(2026, 5, 20),
        getDays,
        onYearChange,
        onProviderToggle,
      });

      instance.update({
        target: undefined as unknown as HTMLElement,
        theme: undefined as unknown as "dark",
        accent: undefined as unknown as string,
        tintHeatmap: undefined as unknown as boolean,
        showProviders: undefined as unknown as boolean,
        showStats: undefined as unknown as boolean,
        state: undefined as unknown as "ready",
        years: undefined as unknown as number[],
        year: undefined as unknown as number,
        today: undefined as unknown as Date,
        getDays: undefined as unknown as typeof getDays,
        providers: undefined as unknown as StreakrProvider[],
        onYearChange: undefined as unknown as typeof onYearChange,
        onProviderToggle: undefined as unknown as typeof onProviderToggle,
      });

      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.dataset.theme).toBe("dark");
      expect(root?.style.getPropertyValue("--sk-accent")).toBe("#123456");
      expect(target.querySelectorAll(".sk-year-tab")).toHaveLength(years.length);
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2026");
      expect(target.querySelector(".sk-providers")).toBeTruthy();
      expect(target.querySelector(".sk-stats")).toBeTruthy();

      instance.setYear(2024);
      expect(onYearChange).toHaveBeenCalledWith(2024);
      target.querySelector<HTMLButtonElement>(".sk-provider")?.click();
      expect(onProviderToggle).toHaveBeenCalled();
    });

    it("update({ target }) throws after mount", () => {
      instance = createStreakr({ target, years, getDays });
      const sk = instance;
      const other = document.createElement("div");
      document.body.appendChild(other);
      expect(() => sk.update({ target: other })).toThrow(/Cannot update 'target' after mount/);
      expect(target.querySelector(".sk-root")).toBeTruthy();
      other.remove();
    });

    it("update({ target: undefined }) is a no-op, not a throw", () => {
      instance = createStreakr({ target, years, getDays });
      const sk = instance;
      expect(() => sk.update({ target: undefined as unknown as HTMLElement })).not.toThrow();
      expect(target.querySelector<HTMLElement>(".sk-root")?.dataset.theme).toBe("dark");
    });

    it("update() applies a valid patch and re-renders", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelectorAll(".sk-stat")).toHaveLength(4);
      instance.update({ showStats: false });
      expect(target.querySelector(".sk-stats")).toBeNull();
    });

    it("update({ year }) reflects the new year in the UI", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });
      instance.update({ year: 2024 });
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2024");
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("2024");
    });

    it("update({ years }) re-derives the active year when it is no longer present", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });
      instance.update({ years: [2022, 2023, 2024] });
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2024");
    });

    it("update({ years: [] }) keeps the active year visible", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });
      instance.update({ years: [] });
      expect(target.querySelectorAll(".sk-year-tab")).toHaveLength(1);
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2026");
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("Year to date");
    });

    it("update() preserves patch order for interdependent year options", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });

      instance.update({ year: 2023, years: [2024, 2025] });
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2025");

      instance.update({ years: [2024, 2025], year: 2023 });
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2023");
    });

    it("update() rejects unknown keys at compile time", () => {
      const sk = createStreakr({ target, years, getDays });
      expect(() => {
        // @ts-expect-error — 'unknownField' is not a key of StreakrOptions
        sk.update({ unknownField: true });
      }).not.toThrow();
      expect(target.querySelector(".sk-root")).toBeTruthy();
      sk.destroy();
    });

    it("update({ theme }) applies the new theme and re-renders", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({ theme: "light" });
      expect(target.querySelector<HTMLElement>(".sk-root")?.dataset.theme).toBe("light");
    });

    it("update({ accent }) applies the new accent color", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({ accent: "#ff0000" });
      expect(
        target.querySelector<HTMLElement>(".sk-root")?.style.getPropertyValue("--sk-accent"),
      ).toBe("#ff0000");
    });

    it("update({ tintHeatmap }) toggles heatmap tinting", () => {
      instance = createStreakr({ target, years, getDays });
      const root = target.querySelector<HTMLElement>(".sk-root");
      expect(root?.style.getPropertyValue("--sk-heat-4")).toBe("#39d353");
      instance.update({ tintHeatmap: false });
      expect(root?.style.getPropertyValue("--sk-heat-4")).toBe("");
    });

    it("update({ showProviders }) toggles the provider chips", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({ showProviders: false });
      expect(target.querySelector(".sk-providers")).toBeNull();
    });

    it("update({ state }) switches to loading state", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({ state: "loading" });
      expect(target.querySelector(".sk-skeleton")).toBeTruthy();
    });

    it("update({ today }) updates the reference date", () => {
      instance = createStreakr({ target, years, year: 2024, getDays });
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("2024");
      instance.update({ today: new Date(2024, 5, 15) });
      expect(target.querySelector(".sk-subtitle")?.textContent).toBe("Year to date");
    });

    it("update({ getDays }) swaps the data source and re-renders", () => {
      instance = createStreakr({ target, years, getDays });
      const newGetDays = vi.fn(() => [{ date: new Date(2026, 0, 1), total: 99 }]);
      instance.update({ getDays: newGetDays });
      expect(newGetDays).toHaveBeenCalledWith(2026);
    });

    it("update({ providers }) replaces the provider list", () => {
      instance = createStreakr({ target, years, getDays });
      instance.update({
        providers: [
          { key: "github", name: "GitHub", color: "#39d353" },
          { key: "gitlab", name: "GitLab", color: "#fc6d26" },
        ],
      });
      const labels = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-provider")).map(
        (provider) => provider.getAttribute("aria-label"),
      );
      expect(labels).toHaveLength(2);
      expect(labels[0]).toContain("GitHub");
      expect(labels[1]).toContain("GitLab");
    });

    it("update({ onYearChange }) registers a new year-change callback", () => {
      instance = createStreakr({ target, years, getDays });
      const cb = vi.fn();
      instance.update({ onYearChange: cb });
      instance.setYear(2024);
      expect(cb).toHaveBeenCalledWith(2024);
    });

    it("update({ onProviderToggle }) registers a new toggle callback", () => {
      instance = createStreakr({ target, years, getDays });
      const cb = vi.fn();
      instance.update({ onProviderToggle: cb });
      const chip = target.querySelector<HTMLButtonElement>(".sk-provider");
      chip?.click();
      expect(cb).toHaveBeenCalledWith("github", false, {
        github: false,
        gitlab: true,
        bitbucket: true,
      });
    });

    it("setYear() updates the active year", () => {
      instance = createStreakr({ target, years, year: 2026, getDays });
      instance.setYear(2024);
      expect(target.querySelector(".sk-year-tab.active")?.textContent).toBe("2024");
    });

    it("setProviders() merges toggle state", () => {
      instance = createStreakr({ target, years, getDays });
      instance.setProviders({ github: false });
      const githubChip = target.querySelector<HTMLButtonElement>(".sk-provider");
      expect(githubChip?.classList.contains("active")).toBe(false);
    });

    it("destroy() removes the root element and tooltip", () => {
      instance = createStreakr({ target, years, getDays });
      instance.destroy();
      instance = null;
      expect(target.querySelector(".sk-root")).toBeNull();
      expect(target.querySelector(".sk-tooltip")).toBeNull();
    });

    it("destroy() removes the keydown listener (modal Escape no-op afterwards)", () => {
      const many = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      instance.destroy();
      instance = null;
      expect(() =>
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
      ).not.toThrow();
    });
  });

  describe("mobile contribution ring", () => {
    const rect = (width: number): DOMRect =>
      ({
        width,
        height: 600,
        top: 0,
        left: 0,
        right: width,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;

    const setContainerWidth = (width: number) => {
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        return rect(width);
      };
    };

    const svgRect = (): DOMRect =>
      ({
        width: 360,
        height: 360,
        top: 0,
        left: 0,
        right: 360,
        bottom: 360,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;

    const pointerAt = (type: string, clientX: number, clientY: number): PointerEvent => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX,
        clientY,
      }) as PointerEvent;
      Object.defineProperty(event, "pointerId", { value: 1 });
      return event;
    };

    const installSvgPointerMocks = (svgEl: SVGSVGElement): void => {
      Object.defineProperty(svgEl, "getBoundingClientRect", {
        configurable: true,
        value: () => svgRect(),
      });
      Object.defineProperty(svgEl, "setPointerCapture", {
        configurable: true,
        value: vi.fn(),
      });
      Object.defineProperty(svgEl, "releasePointerCapture", {
        configurable: true,
        value: vi.fn(),
      });
    };

    it("renders the ring instead of the heatmap on narrow containers", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-ring-svg")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-svg")).toBeNull();
    });

    it("renders the ring skeleton on narrow containers when loading", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, state: "loading", getDays });
      expect(target.querySelector(".sk-ring-svg--skeleton")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-svg--skeleton")).toBeNull();
    });

    it("keeps the heatmap on wide containers", () => {
      setContainerWidth(1024);
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelector(".sk-heatmap-svg")).toBeTruthy();
      expect(target.querySelector(".sk-ring-svg")).toBeNull();
    });

    it("renders 12 month labels around the ring", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, getDays });
      const labels = target.querySelectorAll(".sk-ring-months text");
      expect(labels).toHaveLength(12);
      expect(Array.from(labels).map((l) => l.textContent)).toEqual([
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]);
    });

    it("places guide circles at the start and end of day lines", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, getDays });
      const innerRing = target.querySelector(".sk-ring-inner");
      const outerRing = target.querySelector(".sk-ring-outer");
      const daysGroup = target.querySelector(".sk-ring-days");
      const firstLine = target.querySelector<SVGLineElement>(".sk-ring-line");
      const monthJan = Array.from(
        target.querySelectorAll<SVGTextElement>(".sk-ring-months text"),
      ).find((label) => label.textContent === "Jan");
      const svgChildren = Array.from(target.querySelector(".sk-ring-svg")?.children ?? []);

      expect(innerRing?.getAttribute("r")).toBe("78");
      expect(outerRing?.getAttribute("r")).toBe("150");
      expect(svgChildren.indexOf(innerRing as Element)).toBeGreaterThan(
        svgChildren.indexOf(daysGroup as Element),
      );
      expect(svgChildren.indexOf(outerRing as Element)).toBeGreaterThan(
        svgChildren.indexOf(daysGroup as Element),
      );
      expect(firstLine?.getAttribute("y1")).toBe("102");
      expect(firstLine?.getAttribute("y2")).toBe("31");
      expect(monthJan?.getAttribute("y")).toBe("16");
    });

    it("shows the selected day in the center", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, year: 2026, getDays });
      const count = target.querySelector(".sk-ring-count");
      const date = target.querySelector(".sk-ring-date");
      expect(count).toBeTruthy();
      expect(date).toBeTruthy();
      expect(date?.textContent).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
      expect(target.querySelector(".sk-ring-reset")?.textContent).toBe("RESET");
    });

    it("renders equal-length day lines and leaves future days transparent", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays,
      });

      const lines = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line"));
      const futureLines = lines.filter((line) => line.getAttribute("data-future") === "true");
      const lengths = new Set(
        lines.map((line) => {
          const x1 = Number(line.getAttribute("x1"));
          const y1 = Number(line.getAttribute("y1"));
          const x2 = Number(line.getAttribute("x2"));
          const y2 = Number(line.getAttribute("y2"));
          return Math.hypot(x2 - x1, y2 - y1).toFixed(3);
        }),
      );

      expect(lines).toHaveLength(365);
      expect(lengths.size).toBe(1);
      expect(futureLines).toHaveLength(360);
      expect(futureLines.every((line) => line.getAttribute("stroke") === "transparent")).toBe(true);
    });

    it("renders overlapping day strokes with guide circles in front of a filled ring", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2025],
        year: 2025,
        getDays: () => makeYearDays(2025, 1),
      });

      const lines = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line"));
      const firstLine = lines[0];
      const innerRing = target.querySelector(".sk-ring-inner");
      const outerRing = target.querySelector(".sk-ring-outer");
      const daysGroup = target.querySelector(".sk-ring-days");
      const svgChildren = Array.from(target.querySelector(".sk-ring-svg")?.children ?? []);
      const x2 = Number(firstLine?.getAttribute("x2"));
      const y2 = Number(firstLine?.getAttribute("y2"));
      const outerRadius = Math.hypot(x2 - 180, y2 - 180);
      const outerDayGap = (2 * Math.PI * outerRadius) / lines.length;

      expect(lines).toHaveLength(365);
      expect(Number(firstLine?.getAttribute("stroke-width"))).toBeGreaterThan(outerDayGap);
      expect(lines.every((line) => line.getAttribute("stroke") !== "transparent")).toBe(true);
      expect(svgChildren.indexOf(innerRing as Element)).toBeGreaterThan(
        svgChildren.indexOf(daysGroup as Element),
      );
      expect(svgChildren.indexOf(outerRing as Element)).toBeGreaterThan(
        svgChildren.indexOf(daysGroup as Element),
      );
    });

    it("does not update the center and selector when a day line is hovered", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 1), total: 9, sources: { github: 9 } },
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
        ],
      });

      const jan1Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.getAttribute("data-date")?.startsWith("2026-01-01"),
      );
      const handBefore = target.querySelector(".sk-ring-hand")?.getAttribute("transform");
      const countBefore = target.querySelector(".sk-ring-count")?.textContent;
      const dateBefore = target.querySelector(".sk-ring-date")?.textContent;

      jan1Line?.dispatchEvent(new Event("pointerover", { bubbles: true }));

      expect(target.querySelector(".sk-ring-count")?.textContent).toBe(countBefore);
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe(dateBefore);
      expect(target.querySelector(".sk-ring-hand")?.getAttribute("transform")).toBe(handBefore);
    });

    it("updates the center and selector when a day line is clicked", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 2), total: 7, sources: { github: 7 } },
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
        ],
      });

      const jan2Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-02"),
      );
      const handBefore = target.querySelector(".sk-ring-hand")?.getAttribute("transform");

      jan2Line?.dispatchEvent(new Event("click", { bubbles: true }));

      expect(target.querySelector(".sk-ring-count")?.textContent).toBe("7");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 2");
      expect(target.querySelector(".sk-ring-hand")?.getAttribute("transform")).not.toBe(handBefore);
    });

    it("keeps future day line interactions from changing the center", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays,
      });

      const futureLine = target.querySelector<SVGLineElement>(".sk-ring-line--future");
      const countBefore = target.querySelector(".sk-ring-count")?.textContent;
      const dateBefore = target.querySelector(".sk-ring-date")?.textContent;
      const handBefore = target.querySelector(".sk-ring-hand")?.getAttribute("transform");

      futureLine?.dispatchEvent(new Event("click", { bubbles: true }));

      expect(target.querySelector(".sk-ring-count")?.textContent).toBe(countBefore);
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe(dateBefore);
      expect(target.querySelector(".sk-ring-hand")?.getAttribute("transform")).toBe(handBefore);
    });

    it("keeps the selected day while dragging and suppresses the following click", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
          { date: new Date(2026, 3, 6), total: 11, sources: { github: 11 } },
        ],
      });

      const svgEl = target.querySelector<SVGSVGElement>(".sk-ring-svg");
      expect(svgEl).toBeTruthy();
      if (!svgEl) return;
      installSvgPointerMocks(svgEl);
      const jan1Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-01"),
      );
      const countBefore = target.querySelector(".sk-ring-count")?.textContent;
      const dateBefore = target.querySelector(".sk-ring-date")?.textContent;
      const handBefore = target.querySelector(".sk-ring-hand")?.getAttribute("transform");

      svgEl.dispatchEvent(pointerAt("pointerdown", 180, 30));
      svgEl.dispatchEvent(pointerAt("pointermove", 330, 180));
      svgEl.dispatchEvent(pointerAt("pointerup", 330, 180));
      jan1Line?.dispatchEvent(new Event("click", { bubbles: true }));

      expect(target.querySelector(".sk-ring-count")?.textContent).toBe(countBefore);
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe(dateBefore);
      expect(target.querySelector(".sk-ring-hand")?.getAttribute("transform")).toBe(handBefore);
    });

    it("keeps the ring compact and the shared legend below", () => {
      setContainerWidth(375);
      instance = createStreakr({ target, years, getDays });
      const ring = target.querySelector(".sk-ring");

      expect(target.textContent).not.toContain("CONTRIBUTION RING");
      expect(target.textContent).not.toContain("Arrastra el selector para recorrer el año");
      expect(target.querySelector(".sk-ring-title")).toBeNull();
      expect(target.querySelector(".sk-ring-legend")).toBeNull();
      expect(target.querySelector(".sk-ring-hint")).toBeNull();
      expect(ring?.firstElementChild?.classList.contains("sk-ring-svg-wrap")).toBe(true);
      expect(target.querySelector(".sk-legend")?.textContent).toContain("Less");
      expect(target.querySelector(".sk-legend")?.textContent).toContain("More");
    });

    it("resets the selected day to today when the center is clicked", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 5, 20),
        getDays,
      });
      instance.setYear(2026);
      target.querySelector<HTMLButtonElement>(".sk-ring-center")?.click();
      const date = target.querySelector(".sk-ring-date");
      expect(date?.textContent).toBe("Jun 20");
    });
  });

  describe("accessibility", () => {
    const many = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

    const setContainerWidth = (width: number): void => {
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        const original = originalGetBoundingClientRect.call(this);
        return { ...original, width } as DOMRect;
      };
    };

    it("tooltip has role=tooltip and aria-live=polite", () => {
      instance = createStreakr({ target, years, getDays });
      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.getAttribute("role")).toBe("tooltip");
      expect(tooltip?.getAttribute("aria-live")).toBe("polite");
    });

    it("moves focus to the first year button when the modal opens", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      const yearButtons = target.querySelectorAll<HTMLButtonElement>(".sk-modal-year");
      expect(yearButtons.length).toBeGreaterThan(0);
      expect(document.activeElement).toBe(yearButtons[0]);
    });

    it("traps Tab focus within the modal", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      const modal = target.querySelector<HTMLElement>(".sk-modal");
      expect(modal).toBeTruthy();
      if (!modal) return;
      const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>("button"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      last.focus();
      modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      expect(document.activeElement).toBe(first);

      first.focus();
      modal.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      );
      expect(document.activeElement).toBe(last);
    });

    it("restores focus to the 'More years' button when the modal closes via Escape", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      expect(target.querySelector(".sk-modal")).toBeTruthy();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(target.querySelector(".sk-modal")).toBeNull();
      expect(document.activeElement).toBe(target.querySelector(".sk-year-more"));
    });

    it("restores focus to the 'More years' button when the modal closes via backdrop", () => {
      instance = createStreakr({ target, years: many, getDays });
      target.querySelector<HTMLButtonElement>(".sk-year-more")?.click();
      target.querySelector<HTMLElement>(".sk-modal-overlay")?.click();
      expect(target.querySelector(".sk-modal")).toBeNull();
      expect(document.activeElement).toBe(target.querySelector(".sk-year-more"));
    });

    it("makes non-future ring days focusable with role=button and a descriptive aria-label", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 2), total: 7, sources: { github: 7 } },
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
        ],
      });

      const jan2Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-02"),
      );
      expect(jan2Line?.getAttribute("tabindex")).toBe("-1");
      expect(jan2Line?.getAttribute("role")).toBe("button");
      expect(jan2Line?.getAttribute("aria-label")).toBe("2 Jan 2026, 7 contributions");

      const jan5Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-05"),
      );
      expect(jan5Line?.getAttribute("tabindex")).toBe("0");
      expect(jan5Line?.getAttribute("role")).toBe("button");

      const futureLine = target.querySelector<SVGLineElement>(".sk-ring-line--future");
      expect(futureLine?.getAttribute("tabindex")).toBeNull();
      expect(futureLine?.getAttribute("role")).toBeNull();
    });

    it("activates a focusable ring day on Enter and Space", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 2), total: 7, sources: { github: 7 } },
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
        ],
      });

      const jan2Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-02"),
      );
      jan2Line?.focus();
      jan2Line?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(target.querySelector(".sk-ring-count")?.textContent).toBe("7");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 2");

      const jan5Line = Array.from(target.querySelectorAll<SVGLineElement>(".sk-ring-line")).find(
        (line) => line.dataset.date?.startsWith("2026-01-05"),
      );
      jan5Line?.focus();
      jan5Line?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      expect(target.querySelector(".sk-ring-count")?.textContent).toBe("2");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 5");
    });

    it("roves tabindex and focus across ring days with arrow keys", () => {
      setContainerWidth(375);
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 0, 5),
        getDays: () => [
          { date: new Date(2026, 0, 2), total: 7, sources: { github: 7 } },
          { date: new Date(2026, 0, 5), total: 2, sources: { github: 2 } },
        ],
      });

      const focusable = Array.from(
        target.querySelectorAll<SVGLineElement>(".sk-ring-line:not(.sk-ring-line--future)"),
      );
      expect(focusable).toHaveLength(5);
      const [jan1, jan2, jan3, jan4, jan5] = focusable;

      expect(jan5.getAttribute("tabindex")).toBe("0");
      expect(jan2.getAttribute("tabindex")).toBe("-1");

      jan5.focus();
      jan5.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(document.activeElement).toBe(jan4);
      expect(jan4.getAttribute("tabindex")).toBe("0");
      expect(jan5.getAttribute("tabindex")).toBe("-1");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 4");

      jan4.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(document.activeElement).toBe(jan5);
      expect(jan5.getAttribute("tabindex")).toBe("0");
      expect(jan4.getAttribute("tabindex")).toBe("-1");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 5");

      jan5.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
      expect(document.activeElement).toBe(jan1);
      expect(jan1.getAttribute("tabindex")).toBe("0");
      expect(jan5.getAttribute("tabindex")).toBe("-1");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 1");

      jan1.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      expect(document.activeElement).toBe(jan5);
      expect(jan5.getAttribute("tabindex")).toBe("0");
      expect(jan1.getAttribute("tabindex")).toBe("-1");
      expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 5");

      jan2.focus();
      jan2.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(document.activeElement).toBe(jan3);
      expect(jan3.getAttribute("tabindex")).toBe("0");
      expect(jan2.getAttribute("tabindex")).toBe("-1");

      jan3.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(document.activeElement).toBe(jan2);
      expect(jan2.getAttribute("tabindex")).toBe("0");
      expect(jan3.getAttribute("tabindex")).toBe("-1");
    });
  });
});

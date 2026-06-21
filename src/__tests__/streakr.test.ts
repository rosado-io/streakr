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
  const years = [2022, 2023, 2024, 2025, 2026];
  const getDays = (year: number) => makeYearDays(year);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20));
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
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
      expect(tabs.length).toBe(5);
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
      expect(cells.length).toBe(many.length);
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
      expect(chips.length).toBe(3);
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
      expect(chips.length).toBe(2);
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
      expect(target.querySelectorAll(".sk-provider").length).toBe(0);
    });

    it("shows the chip row when ≥2 providers have contributions", () => {
      instance = createStreakr({
        target,
        years,
        getDays: (y) => [{ date: new Date(y, 0, 5), total: 3, sources: { github: 2, gitlab: 1 } }],
      });
      expect(target.querySelector(".sk-providers")).toBeTruthy();
      expect(target.querySelectorAll(".sk-provider").length).toBe(3);
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
      expect(target.querySelectorAll(".sk-provider.active").length).toBe(3);
    });
  });

  describe("ready body", () => {
    it("renders 4 stat cards by default", () => {
      instance = createStreakr({ target, years, getDays });
      expect(target.querySelectorAll(".sk-stat").length).toBe(4);
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
      expect(target.querySelectorAll(".sk-stat").length).toBe(4);
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
      expect(swatches.length).toBe(5);
      expect(target.querySelector(".sk-legend")?.textContent).toContain("Less");
      expect(target.querySelector(".sk-legend")?.textContent).toContain("More");
    });
  });

  describe("lifecycle states", () => {
    it("renders the loading skeleton when state='loading'", () => {
      instance = createStreakr({ target, years, state: "loading", getDays });
      expect(target.querySelector(".sk-heatmap-svg--skeleton")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-stage > .sk-heatmap-svg-wrap")).toBeTruthy();
      expect(target.querySelector(".sk-legend")).toBeTruthy();
      expect(target.querySelector(".sk-heatmap-svg")).toBeTruthy();
      expect(target.querySelectorAll(".sk-provider").length).toBe(3);
      expect(target.querySelectorAll(".sk-provider-count .sk-skeleton").length).toBe(3);
      expect(target.querySelectorAll(".sk-stat").length).toBe(4);
      expect(target.textContent).toContain("Total Contributions");
      expect(target.textContent).toContain("Best Streak");
      expect(target.textContent).toContain("Current Streak");
      expect(target.textContent).toContain("Active Days");
      expect(target.querySelectorAll(".sk-stat-label .sk-skeleton").length).toBe(0);
      expect(target.querySelectorAll(".sk-stat-value .sk-skeleton").length).toBe(4);
      expect(target.querySelectorAll(".sk-stat-value-skeleton--3").length).toBe(1);
      expect(target.querySelectorAll(".sk-stat-value-skeleton--2").length).toBe(3);
      expect(target.textContent).not.toContain("Loading");
    });

    it("keeps heatmap geometry stable between ready and loading", () => {
      const monthLabels = new Set([
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

    it("update() preserves resolved defaults when callers pass undefined", () => {
      instance = createStreakr({ target, years, theme: "dark", getDays });
      instance.update({ theme: undefined as unknown as "dark" });
      expect(target.querySelector<HTMLElement>(".sk-root")?.dataset.theme).toBe("dark");
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
});

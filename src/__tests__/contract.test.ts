import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStreakr } from "../component/streakr";
import type { StreakrInstance, StreakrOptions } from "../types";

describe("presentation contract", () => {
  let target: HTMLDivElement;
  let instance: StreakrInstance | null = null;
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  const options = (patch: Partial<Omit<StreakrOptions, "target">> = {}): StreakrOptions => ({
    target,
    years: [2026],
    year: 2026,
    today: "2026-07-28",
    days: [{ date: "2026-07-28", count: 3, sources: { github: 3 } }],
    ...patch,
  });

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 1024,
        height: 600,
        top: 0,
        left: 0,
        right: 1024,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => "",
      };
    };
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    instance?.destroy();
    instance = null;
    target.remove();
  });

  it("accepts serializable day data and renders it", () => {
    instance = createStreakr(options());
    expect(target.textContent).toContain("3");
    expect(target.querySelectorAll(".sk-heatmap-cell")).toHaveLength(365);
  });

  it.each(["2026/07/28", "2026-02-30", "26-07-28"])("rejects invalid date %s", (date) => {
    expect(() => createStreakr(options({ days: [{ date, count: 1 }] }))).toThrow(/date/);
  });

  it("rejects duplicate days", () => {
    expect(() =>
      createStreakr(
        options({
          days: [
            { date: "2026-01-01", count: 1 },
            { date: "2026-01-01", count: 2 },
          ],
        }),
      ),
    ).toThrow(/duplicate day/);
  });

  it.each([-1, 1.5, Number.POSITIVE_INFINITY])("rejects invalid count %s", (count) => {
    expect(() => createStreakr(options({ days: [{ date: "2026-01-01", count }] }))).toThrow(
      /non-negative safe integer/,
    );
  });

  it("requires count to equal its source sum", () => {
    expect(() =>
      createStreakr(
        options({
          days: [{ date: "2026-01-01", count: 4, sources: { github: 3 } }],
        }),
      ),
    ).toThrow(/equal the sum/);
  });

  it("rejects source keys that were not declared", () => {
    expect(() =>
      createStreakr(
        options({
          days: [{ date: "2026-01-01", count: 1, sources: { unknown: 1 } }],
        }),
      ),
    ).toThrow(/unknown source/);
  });

  it("rejects duplicate source definitions", () => {
    expect(() =>
      createStreakr(
        options({
          sources: [
            { key: "work", name: "Work", color: "#123456" },
            { key: "work", name: "Work again", color: "#654321" },
          ],
          days: [],
        }),
      ),
    ).toThrow(/duplicate source/);
  });

  it("rejects malformed source definitions", () => {
    expect(() =>
      createStreakr(
        options({
          sources: [null] as unknown as NonNullable<StreakrOptions["sources"]>,
          days: [],
        }),
      ),
    ).toThrow(/source must be an object/);
    expect(() =>
      createStreakr(
        options({
          sources: [{ key: "bad key", name: "Bad", color: "#123456" }],
          days: [],
        }),
      ),
    ).toThrow(/invalid source key/);
    expect(() =>
      createStreakr(
        options({
          sources: [{ key: "work", name: " ", color: "#123456" }],
          days: [],
        }),
      ),
    ).toThrow(/requires a name/);
    expect(() =>
      createStreakr(
        options({
          sources: [{ key: "work", name: "Work", color: "not-a-color" }],
          days: [],
        }),
      ),
    ).toThrow(/invalid color/);
    expect(() =>
      createStreakr(
        options({
          sources: [
            { key: "work", name: "Work", color: "#123456", icon: "svg" },
          ] as unknown as NonNullable<StreakrOptions["sources"]>,
          days: [],
        }),
      ),
    ).toThrow(/icon must be a function/);
  });

  it("rejects invalid years and a selected year outside the list", () => {
    expect(() => createStreakr(options({ years: [2026, 2026] }))).toThrow(/duplicates/);
    expect(() => createStreakr(options({ years: [0] }))).toThrow(/between 1 and 9999/);
    expect(() => createStreakr(options({ years: [2025] }))).toThrow(/year.*included/);
  });

  it("validates required arrays and runtime status values", () => {
    expect(() =>
      createStreakr({ ...options(), days: undefined } as unknown as StreakrOptions),
    ).toThrow(/days.*required/);
    expect(() =>
      createStreakr({ ...options(), status: "waiting" } as unknown as StreakrOptions),
    ).toThrow(/invalid status/);
    expect(() =>
      createStreakr({ ...options(), theme: "ocean" } as unknown as StreakrOptions),
    ).toThrow(/invalid theme/);
    expect(() =>
      createStreakr({ ...options(), showStats: "yes" } as unknown as StreakrOptions),
    ).toThrow(/showStats.*boolean/);
  });

  it("rejects malformed day objects and source maps", () => {
    expect(() =>
      createStreakr(options({ days: [null] as unknown as StreakrOptions["days"] })),
    ).toThrow(/day.*object/);
    expect(() =>
      createStreakr(
        options({
          days: [
            { date: "2026-07-28", count: 1, sources: null },
          ] as unknown as StreakrOptions["days"],
        }),
      ),
    ).toThrow(/sources must be an object/);
  });

  it("restricts accent colors to six-digit hex values", () => {
    expect(() => createStreakr(options({ accent: "rebeccapurple" }))).toThrow(/six-digit hex/);
  });

  it("renders the explicit error state as an alert", () => {
    instance = createStreakr(
      options({
        status: "error",
        errorMessage: "The consumer could not load its data.",
      }),
    );
    const alert = target.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("The consumer could not load its data.");
  });

  it("marks the active year and exposes one keyboard entry into the heatmap", () => {
    instance = createStreakr(options());
    expect(target.querySelector('.sk-year-tab[aria-current="true"]')?.textContent).toBe("2026");
    const cells = Array.from(target.querySelectorAll(".sk-heatmap-cell"));
    expect(cells.filter((cell) => cell.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(cells.every((cell) => cell.getAttribute("aria-label"))).toBe(true);
  });

  it("keeps an update atomic when validation fails", () => {
    instance = createStreakr(options());
    expect(() =>
      instance?.update({
        accent: "invalid",
        days: [{ date: "2026-01-01", count: 10 }],
      }),
    ).toThrow(/six-digit hex/);
    expect(target.textContent).toContain("3");
    expect(target.textContent).not.toContain("10");
  });

  it("keeps source and day updates atomic when their relationship is invalid", () => {
    instance = createStreakr(options());
    expect(() =>
      instance?.update({
        sources: [{ key: "work", name: "Work", color: "#123456" }],
        days: [{ date: "2026-01-01", count: 1, sources: { github: 1 } }],
      }),
    ).toThrow(/unknown source/);

    expect(() =>
      instance?.update({
        days: [{ date: "2026-07-28", count: 4, sources: { github: 4 } }],
      }),
    ).not.toThrow();
    expect(target.textContent).toContain("4");
  });

  it("validates programmatic source state before applying it", () => {
    instance = createStreakr(options());
    expect(() => instance?.setSources(null as unknown as Record<string, boolean>)).toThrow(
      /must be an object/,
    );
    expect(() => instance?.setSources({ unknown: false })).toThrow(/unknown source/);
    expect(() =>
      instance?.setSources({ github: "yes" } as unknown as Record<string, boolean>),
    ).toThrow(/must be a boolean/);
  });
});

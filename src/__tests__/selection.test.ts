import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStreakr } from "../component/streakr";
import type { StreakrDay, StreakrInstance } from "../types";

let instance: StreakrInstance;
let target: HTMLElement;
let width = 800;
const onDaySelect = vi.fn<(day: StreakrDay) => void>();
function mount() {
  instance = createStreakr({
    target,
    years: [2025, 2026],
    year: 2026,
    today: "2026-01-05",
    sources: [
      { key: "work", name: "Work", color: "green" },
      { key: "personal", name: "Personal", color: "blue" },
    ],
    days: [
      { date: "2026-01-02", count: 7, sources: { work: 5, personal: 2 } },
      { date: "2026-01-05", count: 3 },
      { date: "2025-01-01", count: 1 },
    ],
    onDaySelect,
  });
}
const cell = (date: string) => target.querySelector<SVGElement>(`[data-date="${date}"]`)!;
const click = (date: string) =>
  cell(date).dispatchEvent(new MouseEvent("click", { bubbles: true }));
const key = (date: string, key: string) =>
  cell(date).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
beforeEach(() => {
  width = 800;
  target = document.createElement("div");
  document.body.append(target);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    width,
    height: 360,
    top: 0,
    left: 0,
    bottom: 360,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => "",
  }));
  onDaySelect.mockReset();
});
afterEach(() => {
  instance.destroy();
  target.remove();
  vi.restoreAllMocks();
});

describe.each(["heatmap", "ring"])("%s day selection", (view) => {
  beforeEach(() => {
    width = view === "ring" ? 375 : 800;
    mount();
  });
  it("emits filtered serializable data and keeps the selected day pressed", () => {
    expect(onDaySelect).not.toHaveBeenCalled();
    instance.setSources({ personal: false });
    click("2026-01-02");
    expect(onDaySelect).toHaveBeenCalledExactlyOnceWith({
      date: "2026-01-02",
      count: 5,
      sources: { work: 5 },
    });
    expect(cell("2026-01-02").getAttribute("aria-pressed")).toBe("true");
    expect(target.querySelectorAll('[data-date][tabindex="0"]')).toHaveLength(1);
    const day = onDaySelect.mock.calls[0]![0];
    (day.sources as Record<string, number>).work = 100;
    click("2026-01-02");
    expect(onDaySelect.mock.lastCall?.[0].sources?.work).toBe(5);
  });
  it("supports keyboard activation, zero days and total-only data", () => {
    key("2026-01-02", "Enter");
    expect(onDaySelect.mock.lastCall?.[0].count).toBe(7);
    key("2026-01-03", " ");
    expect(onDaySelect.mock.lastCall?.[0]).toEqual({ date: "2026-01-03", count: 0, sources: {} });
    click("2026-01-05");
    expect(onDaySelect.mock.lastCall?.[0]).toEqual({ date: "2026-01-05", count: 3 });
    cell("2026-01-05").focus();
    key("2026-01-05", "ArrowUp");
    expect(onDaySelect.mock.lastCall?.[0].date).toBe("2026-01-04");
  });
  it("does not select future days or emit on rerenders", () => {
    click("2026-01-06");
    key("2026-01-06", "Enter");
    expect(onDaySelect).not.toHaveBeenCalled();
    click("2026-01-02");
    cell("2026-01-02").focus();
    onDaySelect.mockClear();
    instance.update({ showStats: false });
    expect(document.activeElement).toBe(cell("2026-01-02"));
    expect(cell("2026-01-02").getAttribute("aria-pressed")).toBe("true");
    instance.setYear(2025);
    instance.update({ theme: "light" });
    expect(onDaySelect).not.toHaveBeenCalled();
  });
  it("allows replacing, removing and reentering the callback", () => {
    const replacement = vi.fn(() => instance.update({ showStats: false }));
    instance.update({ onDaySelect: replacement });
    click("2026-01-02");
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(onDaySelect).not.toHaveBeenCalled();
    instance.update({ onDaySelect: null });
    click("2026-01-05");
    expect(replacement).toHaveBeenCalledTimes(1);
  });
});

it("preserves a selected date when changing between layouts", () => {
  mount();
  click("2026-01-02");
  cell("2026-01-02").focus();
  width = 375;
  instance.update({ showStats: false });
  expect(target.querySelector(".sk-ring-date")?.textContent).toBe("Jan 2");
  expect(document.activeElement).toBe(cell("2026-01-02"));
  width = 800;
  instance.update({ showStats: true });
  expect(cell("2026-01-02").getAttribute("aria-pressed")).toBe("true");
  expect(onDaySelect).toHaveBeenCalledTimes(1);
});

it("emits once at the end of a ring drag and suppresses its synthetic click", () => {
  width = 375;
  mount();
  const ring = target.querySelector<SVGSVGElement>(".sk-ring-svg")!;
  Object.defineProperties(ring, {
    getBoundingClientRect: { value: () => ({ left: 0, top: 0, width: 360, height: 360 }) },
    setPointerCapture: { value: vi.fn() },
    hasPointerCapture: { value: () => true },
    releasePointerCapture: { value: vi.fn() },
  });
  const pointer = (type: string, date: string) => {
    const line = cell(date);
    const x = Number(line.getAttribute("x2")) - 180;
    const y = Number(line.getAttribute("y2")) - 180;
    const length = Math.hypot(x, y);
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX: 180 + (x / length) * 120,
      clientY: 180 + (y / length) * 120,
    });
    Object.defineProperty(event, "pointerId", { value: 1 });
    ring.dispatchEvent(event);
  };
  pointer("pointerdown", "2026-01-02");
  pointer("pointermove", "2026-01-04");
  expect(onDaySelect).not.toHaveBeenCalled();
  pointer("pointerup", "2026-01-04");
  click("2026-01-04");
  expect(onDaySelect).toHaveBeenCalledExactlyOnceWith({
    date: "2026-01-04",
    count: 0,
    sources: {},
  });
  onDaySelect.mockClear();
  pointer("pointerdown", "2026-01-02");
  pointer("pointercancel", "2026-01-02");
  expect(onDaySelect).not.toHaveBeenCalled();
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createStreakr } from "../component/streakr";
import { createInitialState, resolveConfig } from "../component/config";
import { applyUpdate } from "../component/update";
import { createThemeController } from "../component/theme";
import type { StreakrInstance } from "../types";

const instances: StreakrInstance[] = [];
const options = () => {
  const target = document.createElement("div");
  document.body.appendChild(target);
  return {
    target,
    years: [2025, 2026],
    year: 2026,
    today: "2026-06-20",
    days: [{ date: "2026-06-20", count: 3, sources: { work: 2, personal: 1 } }],
    sources: [
      { key: "work", name: "Work", color: "green" },
      { key: "personal", name: "Personal", color: "blue" },
    ],
  };
};
afterEach(() => {
  instances.splice(0).forEach((instance) => instance.destroy());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("maintenance regressions", () => {
  it("does not recurse when two instances synchronize the same year", () => {
    const onA = vi.fn((year: number) => b.setYear(year));
    const onB = vi.fn((year: number) => a.setYear(year));
    const a = createStreakr({ ...options(), onYearChange: onA });
    const b = createStreakr({ ...options(), onYearChange: onB });
    instances.push(a, b);
    a.setYear(2025);
    expect(onA).toHaveBeenCalledExactlyOnceWith(2025);
    expect(onB).toHaveBeenCalledExactlyOnceWith(2025);
    expect(document.querySelectorAll('.sk-year-tab[aria-current="true"]')).toHaveLength(2);
  });

  it("retains keyboard focus after switching years and toggling a source", () => {
    const opts = options();
    instances.push(createStreakr(opts));
    const year = opts.target.querySelector<HTMLButtonElement>('[data-sk-focus="year-2025"]')!;
    year.focus();
    year.click();
    expect(document.activeElement?.getAttribute("data-sk-focus")).toBe("year-2025");
    const current = opts.target.querySelector<HTMLButtonElement>('[data-sk-focus="year-2026"]')!;
    current.click();
    const source = opts.target.querySelector<HTMLButtonElement>('[data-sk-focus="source-work"]')!;
    source.focus();
    source.click();
    expect(document.activeElement?.getAttribute("data-sk-focus")).toBe("source-work");
    expect(document.activeElement?.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps mounted nodes and focus when only appearance changes", () => {
    const opts = options();
    const instance = createStreakr(opts);
    instances.push(instance);
    const button = opts.target.querySelector<HTMLButtonElement>("button")!;
    button.focus();
    instance.update({ theme: "light", accent: "#123456", tintHeatmap: false });
    expect(button.isConnected).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(opts.target.querySelector<HTMLElement>(".sk-root")?.dataset.theme).toBe("light");
  });

  it("only revalidates days when data or source definitions change", () => {
    const cfg = resolveConfig(options());
    const state = createInitialState(cfg);
    const days = cfg.days;
    const hooks = { onThemeChange: vi.fn() };
    applyUpdate(cfg, state, { accent: "#123456", year: 2025 }, hooks);
    expect(cfg.days).toBe(days);
    expect(() => applyUpdate(cfg, state, { sources: [] }, hooks)).toThrow("unknown source");
    expect(cfg.days).toBe(days);
    applyUpdate(cfg, state, { days: [{ date: "2025-01-01", count: 8 }] }, hooks);
    expect(cfg.days[0]?.total).toBe(8);
  });

  it("removes the listener from the exact MediaQueryList that registered it", () => {
    const lists: MediaQueryList[] = [];
    vi.spyOn(window, "matchMedia").mockImplementation((media) => {
      const list = Object.assign(new EventTarget(), { media, matches: false }) as MediaQueryList;
      lists.push(list);
      return list;
    });
    const cfg = resolveConfig({ ...options(), theme: "system" });
    const root = document.createElement("div");
    const theme = createThemeController(cfg, root);
    theme.setup();
    const first = lists[0]!;
    const change = () => Object.assign(new Event("change"), { matches: true });
    first.dispatchEvent(change());
    expect(root.dataset.theme).toBe("dark");
    theme.setup();
    root.dataset.theme = "light";
    first.dispatchEvent(change());
    expect(root.dataset.theme).toBe("light");
    theme.cleanup();
    lists[1]!.dispatchEvent(change());
    expect(root.dataset.theme).toBe("light");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStreakr } from "../component/streakr";
import { providerIconHtml } from "../component/providers";
import { AGENT_PROVIDERS, DEFAULT_PROVIDERS } from "../index";
import type { StreakrInstance, StreakrProvider } from "../types";

const ICON_KEYS = ["claude", "codex", "opencode", "copilot"];

const byKey = (key: string): StreakrProvider => {
  const provider = AGENT_PROVIDERS.find((p) => p.key === key);
  if (!provider) throw new Error(`missing preset entry: ${key}`);
  return provider;
};

describe("AGENT_PROVIDERS", () => {
  it("exposes exactly the agent keys in order", () => {
    expect(AGENT_PROVIDERS.map((p) => p.key)).toEqual(["claude", "codex", "opencode", "copilot"]);
  });

  it("gives every entry a non-empty name and a hex color", () => {
    AGENT_PROVIDERS.forEach((p) => {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("uses display names matching each brand", () => {
    expect(AGENT_PROVIDERS.map((p) => p.name)).toEqual(["Claude", "Codex", "opencode", "Copilot"]);
  });

  it("keeps colors unique within the preset and against DEFAULT_PROVIDERS", () => {
    const colors = [...DEFAULT_PROVIDERS, ...AGENT_PROVIDERS].map((p) => p.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  describe("icons", () => {
    it("returns an SVG for every agent key, theme-adaptive except Claude's brand orange", () => {
      ICON_KEYS.forEach((key) => {
        const icon = providerIconHtml(byKey(key));
        expect(icon).toBeTypeOf("string");
        expect(icon).toContain("<svg");
        expect(icon).toContain("viewBox");
        expect(icon).toContain(key === "claude" ? "#d97757" : "currentColor");
      });
    });

    it("resolves every preset entry to an inline SVG", () => {
      AGENT_PROVIDERS.forEach((p) => {
        expect(providerIconHtml(p)).toMatch(/^<svg /);
      });
    });
  });

  describe("chips", () => {
    let target: HTMLDivElement;
    let instance: StreakrInstance | null = null;
    let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

    beforeEach(() => {
      originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        const original = originalGetBoundingClientRect.call(this);
        return { ...original, width: 1024 } as DOMRect;
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

    const mount = () => {
      instance = createStreakr({
        target,
        years: [2026],
        year: 2026,
        today: new Date(2026, 5, 20),
        providers: [...DEFAULT_PROVIDERS, ...AGENT_PROVIDERS],
        getDays: () => [{ date: new Date(2026, 0, 5), total: 4, sources: { claude: 3, codex: 1 } }],
      });
    };

    it("renders one chip per provider with agent labels and counts", () => {
      mount();
      const labels = Array.from(target.querySelectorAll(".sk-provider")).map((chip) =>
        chip.getAttribute("aria-label"),
      );
      expect(labels).toEqual([
        "GitHub: 0 contributions, enabled",
        "GitLab: 0 contributions, enabled",
        "Bitbucket: 0 contributions, enabled",
        "Claude: 3 contributions, enabled",
        "Codex: 1 contributions, enabled",
        "opencode: 0 contributions, enabled",
        "Copilot: 0 contributions, enabled",
      ]);
    });

    it("renders SVG icons for every agent chip", () => {
      mount();
      const chips = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-provider"));
      const iconFor = (name: string) =>
        chips
          .find((chip) => chip.getAttribute("aria-label")?.startsWith(name))
          ?.querySelector<HTMLElement>(".sk-provider-icon");

      ["Claude", "Codex", "opencode", "Copilot"].forEach((name) => {
        expect(iconFor(name)?.querySelector("svg")).toBeTruthy();
      });
    });

    it("shows a tooltip with the provider name on chip hover", () => {
      mount();
      const chips = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-provider"));
      const codexChip = chips.find((chip) =>
        chip.getAttribute("aria-label")?.startsWith("Codex"),
      );
      codexChip?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      const tooltip = target.querySelector(".sk-tooltip");
      expect(tooltip?.classList.contains("visible")).toBe(true);
      expect(tooltip?.textContent).toBe("Codex");

      codexChip?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      expect(tooltip?.classList.contains("visible")).toBe(false);
    });
  });
});

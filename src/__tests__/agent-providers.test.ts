import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStreakr } from "../component/streakr";
import { providerIconHtml } from "../component/providers";
import { AGENT_PROVIDERS, DEFAULT_PROVIDERS } from "../index";
import type { StreakrInstance, StreakrProvider } from "../types";

const ICON_KEYS = ["claude", "opencode", "copilot"];

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
    it("returns a currentColor SVG for claude, opencode, and copilot", () => {
      ICON_KEYS.forEach((key) => {
        const icon = providerIconHtml(byKey(key));
        expect(icon).toBeTypeOf("string");
        expect(icon).toContain("<svg");
        expect(icon).toContain("viewBox");
        expect(icon).toContain("currentColor");
      });
    });

    it("returns null for codex so its chip falls back to the color dot", () => {
      expect(providerIconHtml(byKey("codex"))).toBeNull();
    });

    it("resolves every preset entry to either null or an inline SVG", () => {
      AGENT_PROVIDERS.forEach((p) => {
        const icon = providerIconHtml(p);
        if (ICON_KEYS.includes(p.key)) {
          expect(icon).toMatch(/^<svg /);
        } else {
          expect(icon).toBeNull();
        }
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
      const titles = Array.from(target.querySelectorAll(".sk-provider")).map((chip) =>
        chip.getAttribute("title"),
      );
      expect(titles).toEqual([
        "GitHub — 0",
        "GitLab — 0",
        "Bitbucket — 0",
        "Claude — 3",
        "Codex — 1",
        "opencode — 0",
        "Copilot — 0",
      ]);
    });

    it("renders SVG icons for agent chips that ship one and a color dot for codex", () => {
      mount();
      const chips = Array.from(target.querySelectorAll<HTMLButtonElement>(".sk-provider"));
      const iconFor = (name: string) =>
        chips
          .find((chip) => chip.getAttribute("title")?.startsWith(name))
          ?.querySelector<HTMLElement>(".sk-provider-icon");

      ["Claude", "opencode", "Copilot"].forEach((name) => {
        expect(iconFor(name)?.querySelector("svg")).toBeTruthy();
      });

      const codexIcon = iconFor("Codex");
      expect(codexIcon?.querySelector("svg")).toBeNull();
      expect(codexIcon?.style.background.toLowerCase()).toContain("#10a37f");
    });
  });
});

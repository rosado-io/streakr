import { describe, it, expect } from "vitest";
import {
  AGENT_TRAILER_RULES,
  parseCoAuthors,
  matchAgent,
  parseAgentCoAuthors,
} from "../providers/trailers";

describe("parseCoAuthors", () => {
  it("extracts name and email from a trailer", () => {
    expect(parseCoAuthors("Co-authored-by: Jane Doe <jane@example.com>")).toEqual([
      { name: "Jane Doe", email: "jane@example.com" },
    ]);
  });

  it("matches the trailer key case-insensitively", () => {
    const variants = [
      "Co-Authored-By: Claude <noreply@anthropic.com>",
      "co-authored-by: Claude <noreply@anthropic.com>",
      "CO-AUTHORED-BY: Claude <noreply@anthropic.com>",
    ];
    for (const line of variants) {
      expect(parseCoAuthors(line)).toEqual([{ name: "Claude", email: "noreply@anthropic.com" }]);
    }
  });

  it("extracts multiple trailers from a full commit message", () => {
    const message = [
      "feat(loading): add sweep",
      "",
      "Some body text.",
      "",
      "Co-authored-by: Eduardo Rosado <rodsado.io@gmail.com>",
      "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>",
      "Co-authored-by: opencode (glm-5.2) <noreply@opencode.ai>",
    ].join("\n");
    expect(parseCoAuthors(message)).toEqual([
      { name: "Eduardo Rosado", email: "rodsado.io@gmail.com" },
      { name: "Claude Opus 4.7 (1M context)", email: "noreply@anthropic.com" },
      { name: "opencode (glm-5.2)", email: "noreply@opencode.ai" },
    ]);
  });

  it("tolerates surrounding whitespace and CRLF line endings", () => {
    const message = "subject\r\n\r\n  Co-authored-by: Claude <noreply@anthropic.com>  \r\n";
    expect(parseCoAuthors(message)).toEqual([{ name: "Claude", email: "noreply@anthropic.com" }]);
  });

  it("returns an empty name when the trailer only has an email", () => {
    expect(parseCoAuthors("Co-authored-by: <bot@example.com>")).toEqual([
      { name: "", email: "bot@example.com" },
    ]);
  });

  it("ignores non-trailer lines and inline mentions", () => {
    const message = [
      "docs: explain co-authored-by trailers",
      "",
      "Mentions like Co-authored-by: someone mid-sentence <x@y.z> only count on their own line.",
      "Co-authored-by: no email brackets here",
    ].join("\n");
    expect(parseCoAuthors(message)).toEqual([]);
  });

  it("returns an empty list for an empty message", () => {
    expect(parseCoAuthors("")).toEqual([]);
  });
});

describe("matchAgent", () => {
  const realWorldAgents = [
    [
      "Claude Sonnet 4.6 <noreply@anthropic.com>",
      "Claude Sonnet 4.6",
      "noreply@anthropic.com",
      "claude",
    ],
    [
      "Claude Opus 4.7 (1M context)",
      "Claude Opus 4.7 (1M context)",
      "noreply@anthropic.com",
      "claude",
    ],
    ["bare Claude", "Claude", "noreply@anthropic.com", "claude"],
    ["Codex", "Codex", "noreply@openai.com", "codex"],
    ["opencode running GLM", "opencode (glm-5.2)", "noreply@opencode.ai", "opencode"],
    ["Copilot", "Copilot", "175728472+Copilot@users.noreply.github.com", "copilot"],
    [
      "Copilot SWE agent",
      "copilot-swe-agent[bot]",
      "198982749+copilot-swe-agent[bot]@users.noreply.github.com",
      "copilot",
    ],
  ] as const;

  it.each(realWorldAgents)("maps %s to its agent key", (_label, name, email, key) => {
    expect(matchAgent({ name, email })).toBe(key);
  });

  it("keys multi-model harnesses by agent, not by model", () => {
    expect(matchAgent({ name: "opencode (glm-5.2)", email: "noreply@opencode.ai" })).toBe(
      "opencode",
    );
  });

  it("matches emails case-insensitively", () => {
    expect(matchAgent({ name: "Claude", email: "NoReply@Anthropic.com" })).toBe("claude");
  });

  const nonAgents = [
    ["dependabot", "dependabot[bot]", "49699333+dependabot[bot]@users.noreply.github.com"],
    ["a human co-author", "Eduardo Rosado", "rodsado.io@gmail.com"],
    ["a lookalike email domain", "Claude", "noreply@anthropic.com.evil.example"],
    ["a plus-address impersonation", "Claude", "foo+noreply@anthropic.com"],
  ] as const;

  it.each(nonAgents)("does not match %s", (_label, name, email) => {
    expect(matchAgent({ name, email })).toBeNull();
  });

  it("requires every condition of a rule to match", () => {
    expect(matchAgent({ name: "renovate[bot]", email: "bot@users.noreply.github.com" })).toBeNull();
  });

  it("never matches a rule without conditions", () => {
    expect(
      matchAgent({ name: "Anyone", email: "anyone@example.com" }, [{ key: "all" }]),
    ).toBeNull();
  });

  it("returns the first matching rule", () => {
    const rules = [
      { key: "first", email: "noreply@anthropic.com" },
      { key: "second", email: "noreply@anthropic.com" },
    ];
    expect(matchAgent({ name: "Claude", email: "noreply@anthropic.com" }, rules)).toBe("first");
  });
});

describe("parseAgentCoAuthors", () => {
  it("keeps only agent trailers and preserves the display name as model metadata", () => {
    const message = [
      "feat: something",
      "",
      "Co-authored-by: Eduardo Rosado <rodsado.io@gmail.com>",
      "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>",
      "Co-authored-by: opencode (glm-5.2) <noreply@opencode.ai>",
      "Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
    ].join("\n");
    expect(parseAgentCoAuthors(message)).toEqual([
      { key: "claude", name: "Claude Sonnet 4.6", email: "noreply@anthropic.com" },
      { key: "opencode", name: "opencode (glm-5.2)", email: "noreply@opencode.ai" },
    ]);
  });

  it("supports custom rules, e.g. grouping by model instead of agent", () => {
    const message = "Co-authored-by: opencode (glm-5.2) <noreply@opencode.ai>";
    expect(parseAgentCoAuthors(message, [{ key: "glm", name: /glm/i }])).toEqual([
      { key: "glm", name: "opencode (glm-5.2)", email: "noreply@opencode.ai" },
    ]);
  });

  it("returns an empty list when no agent signed", () => {
    const message = "Co-authored-by: Eduardo Rosado <rodsado.io@gmail.com>";
    expect(parseAgentCoAuthors(message)).toEqual([]);
  });
});

describe("AGENT_TRAILER_RULES", () => {
  it("covers the four known agents", () => {
    expect(AGENT_TRAILER_RULES.map((rule) => rule.key)).toEqual([
      "claude",
      "codex",
      "opencode",
      "copilot",
    ]);
  });
});

import { describe, it, expect } from "vitest";
import { splitCoAuthored } from "../core/split";
import type { SplitCoAuthoredOptions } from "../core/split";
import type { ContributionDay } from "../types";

const expectSourcesSumToCount = (days: ContributionDay[]): void => {
  days.forEach((day) => {
    const sum = Object.values(day.sources ?? {}).reduce((acc, value) => acc + value, 0);
    expect(sum).toBe(day.count);
  });
};

const deepFreezeDays = (days: ContributionDay[]): ContributionDay[] => {
  days.forEach((day) => {
    if (day.sources) Object.freeze(day.sources);
    Object.freeze(day);
  });
  return Object.freeze(days) as ContributionDay[];
};

interface SplitCase {
  name: string;
  totalDays: ContributionDay[];
  agentDays: Record<string, ContributionDay[]>;
  options?: SplitCoAuthoredOptions;
  expected: ContributionDay[];
}

const cases: SplitCase[] = [
  {
    name: "partitions overlapping dates exactly between human and agent",
    totalDays: [
      { date: "2025-01-01", count: 5 },
      { date: "2025-01-02", count: 3 },
    ],
    agentDays: {
      claude: [
        { date: "2025-01-01", count: 2 },
        { date: "2025-01-02", count: 1 },
      ],
    },
    expected: [
      { date: "2025-01-01", count: 5, sources: { github: 3, claude: 2 } },
      { date: "2025-01-02", count: 3, sources: { github: 2, claude: 1 } },
    ],
  },
  {
    name: "splits a single day among multiple agents",
    totalDays: [{ date: "2025-03-10", count: 10 }],
    agentDays: {
      claude: [{ date: "2025-03-10", count: 4 }],
      copilot: [{ date: "2025-03-10", count: 3 }],
    },
    expected: [{ date: "2025-03-10", count: 10, sources: { github: 3, claude: 4, copilot: 3 } }],
  },
  {
    name: "assigns the full total to the human on dates absent from agentDays",
    totalDays: [
      { date: "2025-01-01", count: 4 },
      { date: "2025-01-02", count: 2 },
    ],
    agentDays: { claude: [{ date: "2025-01-01", count: 1 }] },
    expected: [
      { date: "2025-01-01", count: 4, sources: { github: 3, claude: 1 } },
      { date: "2025-01-02", count: 2, sources: { github: 2, claude: 0 } },
    ],
  },
  {
    name: "raises count to the agent sum with human 0 on dates absent from totalDays",
    totalDays: [{ date: "2025-01-01", count: 2 }],
    agentDays: { claude: [{ date: "2025-01-02", count: 3 }] },
    expected: [
      { date: "2025-01-01", count: 2, sources: { github: 2, claude: 0 } },
      { date: "2025-01-02", count: 3, sources: { github: 0, claude: 3 } },
    ],
  },
  {
    name: "raises count to the agent sum when agents exceed the total so sources still sum to count",
    totalDays: [{ date: "2025-01-01", count: 2 }],
    agentDays: {
      claude: [{ date: "2025-01-01", count: 4 }],
      copilot: [{ date: "2025-01-01", count: 1 }],
    },
    expected: [{ date: "2025-01-01", count: 5, sources: { github: 0, claude: 4, copilot: 1 } }],
  },
  {
    name: "clamps human to 0 instead of going negative when a single agent exceeds the total",
    totalDays: [{ date: "2025-01-01", count: 1 }],
    agentDays: { claude: [{ date: "2025-01-01", count: 5 }] },
    expected: [{ date: "2025-01-01", count: 5, sources: { github: 0, claude: 5 } }],
  },
  {
    name: "sums duplicate dates in both inputs before splitting",
    totalDays: [
      { date: "2025-01-01", count: 2 },
      { date: "2025-01-01", count: 3 },
    ],
    agentDays: {
      claude: [
        { date: "2025-01-01", count: 1 },
        { date: "2025-01-01", count: 1 },
      ],
    },
    expected: [{ date: "2025-01-01", count: 5, sources: { github: 3, claude: 2 } }],
  },
  {
    name: "sorts unsorted inputs and zero-fills gaps within each input range",
    totalDays: [
      { date: "2025-01-03", count: 1 },
      { date: "2025-01-01", count: 4 },
    ],
    agentDays: {
      claude: [
        { date: "2025-01-03", count: 1 },
        { date: "2025-01-01", count: 2 },
      ],
    },
    expected: [
      { date: "2025-01-01", count: 4, sources: { github: 2, claude: 2 } },
      { date: "2025-01-02", count: 0, sources: { github: 0, claude: 0 } },
      { date: "2025-01-03", count: 1, sources: { github: 0, claude: 1 } },
    ],
  },
  {
    name: "returns normalized totals with humanKey sources when agentDays is empty",
    totalDays: [
      { date: "2025-01-02", count: 2 },
      { date: "2025-01-01", count: 1 },
    ],
    agentDays: {},
    expected: [
      { date: "2025-01-01", count: 1, sources: { github: 1 } },
      { date: "2025-01-02", count: 2, sources: { github: 2 } },
    ],
  },
  {
    name: "attributes everything to agents when totalDays is empty",
    totalDays: [],
    agentDays: {
      claude: [{ date: "2025-01-01", count: 2 }],
      copilot: [{ date: "2025-01-02", count: 1 }],
    },
    expected: [
      { date: "2025-01-01", count: 2, sources: { github: 0, claude: 2, copilot: 0 } },
      { date: "2025-01-02", count: 1, sources: { github: 0, claude: 0, copilot: 1 } },
    ],
  },
  {
    name: "returns an empty array when both inputs are empty",
    totalDays: [],
    agentDays: {},
    expected: [],
  },
  {
    name: "uses the humanKey override for the human portion of sources",
    totalDays: [{ date: "2025-01-01", count: 3 }],
    agentDays: { claude: [{ date: "2025-01-01", count: 1 }] },
    options: { humanKey: "gitlab" },
    expected: [{ date: "2025-01-01", count: 3, sources: { gitlab: 2, claude: 1 } }],
  },
  {
    name: "allows an agent named github when the humanKey is overridden",
    totalDays: [{ date: "2025-01-01", count: 3 }],
    agentDays: { github: [{ date: "2025-01-01", count: 1 }] },
    options: { humanKey: "gitlab" },
    expected: [{ date: "2025-01-01", count: 3, sources: { gitlab: 2, github: 1 } }],
  },
];

describe("splitCoAuthored", () => {
  it.each(cases)("$name", ({ totalDays, agentDays, options, expected }) => {
    const result = splitCoAuthored(totalDays, agentDays, options);
    expect(result).toEqual(expected);
    expectSourcesSumToCount(result);
  });

  it("throws when an agent key equals the default humanKey", () => {
    expect(() => splitCoAuthored([], { github: [] })).toThrow(
      'Agent key "github" must not equal the human key',
    );
  });

  it("throws when an agent key equals an overridden humanKey", () => {
    expect(() => splitCoAuthored([], { gitlab: [] }, { humanKey: "gitlab" })).toThrow(
      'Agent key "gitlab" must not equal the human key',
    );
  });

  it("includes every agent key on every output day", () => {
    const result = splitCoAuthored(
      [
        { date: "2025-01-01", count: 1 },
        { date: "2025-01-03", count: 2 },
      ],
      {
        claude: [{ date: "2025-01-01", count: 1 }],
        copilot: [{ date: "2025-01-03", count: 1 }],
      },
    );
    expect(result).toHaveLength(3);
    result.forEach((day) => {
      expect(Object.keys(day.sources ?? {}).sort()).toEqual(["claude", "copilot", "github"]);
    });
    expectSourcesSumToCount(result);
  });

  it("returns days sorted ascending even for disjoint input ranges", () => {
    const result = splitCoAuthored([{ date: "2025-02-01", count: 1 }], {
      claude: [{ date: "2025-01-05", count: 2 }],
    });
    const dates = result.map((day) => day.date);
    expect(dates).toEqual([...dates].sort((a, b) => a.localeCompare(b)));
    expect(dates).toEqual(["2025-01-05", "2025-02-01"]);
    expectSourcesSumToCount(result);
  });

  it("does not mutate its inputs", () => {
    const totalDays = deepFreezeDays([
      { date: "2025-01-03", count: 2, sources: { github: 2 } },
      { date: "2025-01-01", count: 3 },
      { date: "2025-01-01", count: 1 },
    ]);
    const agentDays = {
      claude: deepFreezeDays([
        { date: "2025-01-01", count: 5 },
        { date: "2025-01-02", count: 1 },
      ]),
    };
    Object.freeze(agentDays);
    const totalCopy = structuredClone(totalDays);
    const agentsCopy = structuredClone(agentDays);

    const result = splitCoAuthored(totalDays, agentDays);

    expect(totalDays).toEqual(totalCopy);
    expect(agentDays).toEqual(agentsCopy);
    expectSourcesSumToCount(result);
  });
});

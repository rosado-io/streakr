import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createPublicSnapshot } from "../snapshot/create";
import { writePublicSnapshot } from "../snapshot/write";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("public snapshots", () => {
  it("keeps only versioned daily counts and source keys", () => {
    const snapshot = createPublicSnapshot({
      generatedAt: "2026-07-16T06:00:00.000Z",
      range: { start: "2026-01-01", end: "2026-01-03" },
      activity: {
        github: [
          { date: "2026-01-01", count: 3, sources: { privateRepoName: 3 } },
          { date: "2026-01-02", count: 0 },
        ],
      },
      agents: [
        { date: "2026-01-01", count: 2, sources: { claude: 2, codex: 0 } },
        { date: "2026-01-03", count: 0, sources: { claude: 0 } },
      ],
    });

    expect(snapshot).toEqual({
      schemaVersion: 1,
      generatedAt: "2026-07-16T06:00:00.000Z",
      range: { start: "2026-01-01", end: "2026-01-03" },
      activity: { github: [{ date: "2026-01-01", count: 3 }] },
      agents: [{ date: "2026-01-01", count: 2, sources: { claude: 2 } }],
    });
    expect(JSON.stringify(snapshot)).not.toContain("privateRepoName");
  });

  it("rejects malformed or out-of-range public data", () => {
    expect(() =>
      createPublicSnapshot({
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: { github: [{ date: "2026-01-03", count: 1 }] },
        agents: [],
      }),
    ).toThrow(/outside snapshot range/i);

    expect(() =>
      createPublicSnapshot({
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: { github: [{ date: "2026-01-01", count: -1 }] },
        agents: [],
      }),
    ).toThrow(/non-negative integer/i);

    expect(() =>
      createPublicSnapshot({
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: { github: [{ date: "01/02/2026", count: 1 }] },
        agents: [],
      }),
    ).toThrow(/invalid contribution date/i);

    expect(() =>
      createPublicSnapshot({
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: { "../secrets": [{ date: "2026-01-01", count: 1 }] },
        agents: [],
      }),
    ).toThrow(/invalid public source key/i);

    expect(() =>
      createPublicSnapshot({
        generatedAt: "not-a-date",
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: {},
        agents: [],
      }),
    ).toThrow(/invalid snapshot generation date/i);

    expect(() =>
      createPublicSnapshot({
        range: { start: "2026-01-01", end: "2026-01-02" },
        activity: {},
        agents: [{ date: "2026-01-01", count: 1, sources: { "bad key": 1 } }],
      }),
    ).toThrow(/invalid public source key/i);
  });

  it("stamps the generation time and sorts days chronologically", () => {
    const snapshot = createPublicSnapshot({
      range: { start: "2026-01-01", end: "2026-01-05" },
      activity: {
        github: [
          { date: "2026-01-05", count: 1 },
          { date: "2026-01-02", count: 2 },
        ],
      },
      agents: [
        { date: "2026-01-04", count: 1, sources: { codex: 1 } },
        { date: "2026-01-01", count: 2, sources: { claude: 2 } },
      ],
    });

    expect(Number.isNaN(Date.parse(snapshot.generatedAt))).toBe(false);
    expect(snapshot.activity.github.map(({ date }) => date)).toEqual(["2026-01-02", "2026-01-05"]);
    expect(snapshot.agents.map(({ date }) => date)).toEqual(["2026-01-01", "2026-01-04"]);
  });

  it("replaces the previous file only after a complete snapshot is ready", async () => {
    const root = mkdtempSync(join(tmpdir(), "streakr-snapshot-"));
    roots.push(root);
    const output = join(root, "nested", "contributions.json");
    mkdirSync(join(root, "nested"));
    writeFileSync(output, "old\n", { encoding: "utf8", flag: "w" });

    const snapshot = createPublicSnapshot({
      generatedAt: "2026-07-16T06:00:00.000Z",
      range: { start: "2026-01-01", end: "2026-01-01" },
      activity: { github: [{ date: "2026-01-01", count: 1 }] },
      agents: [],
    });
    await writePublicSnapshot(output, snapshot);

    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(snapshot);
  });
});

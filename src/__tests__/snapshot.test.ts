import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createPublicSnapshot, writePublicSnapshot } from "../snapshot";

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

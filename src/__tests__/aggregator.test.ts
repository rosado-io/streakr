import { describe, it, expect, vi } from "vitest";
import { aggregate } from "../providers/aggregator";
import type { Provider } from "../providers/types";
import type { ContributionDay, FetchParams } from "../types";

function mockProvider(name: string, days: ContributionDay[]): Provider {
  return {
    name,
    fetchEvents: vi.fn().mockResolvedValue(days),
  };
}

function failingProvider(name: string): Provider {
  return {
    name,
    fetchEvents: vi.fn().mockRejectedValue(new Error(`${name} API error`)),
  };
}

const params: FetchParams = {
  user: "testuser",
  start: "2025-06-01",
  end: "2025-06-30",
};

describe("aggregate", () => {
  it("returns empty array for no providers", async () => {
    const result = await aggregate([], params);
    expect(result).toEqual([]);
  });

  it("returns data from a single provider", async () => {
    const github = mockProvider("github", [
      { date: "2025-06-15", count: 3 },
      { date: "2025-06-16", count: 1 },
    ]);

    const result = await aggregate([github], params);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: "2025-06-15",
      count: 3,
      sources: { github: 3 },
    });
  });

  it("merges data from multiple providers", async () => {
    const github = mockProvider("github", [{ date: "2025-06-15", count: 3 }]);
    const gitlab = mockProvider("gitlab", [{ date: "2025-06-15", count: 2 }]);

    const result = await aggregate([github, gitlab], params);
    expect(result).toHaveLength(2);
    expect(result[0].sources).toEqual({ github: 3 });
    expect(result[1].sources).toEqual({ gitlab: 2 });
  });

  it("silently skips failed providers", async () => {
    const github = mockProvider("github", [{ date: "2025-06-15", count: 5 }]);
    const broken = failingProvider("broken");

    const result = await aggregate([github, broken], params);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toEqual({ github: 5 });
  });

  it("returns empty array when all providers fail", async () => {
    const result = await aggregate([failingProvider("a"), failingProvider("b")], params);
    expect(result).toEqual([]);
  });

  it("passes params to each provider", async () => {
    const github = mockProvider("github", []);
    const gitlab = mockProvider("gitlab", []);

    await aggregate([github, gitlab], params);

    expect(github.fetchEvents).toHaveBeenCalledWith(params);
    expect(gitlab.fetchEvents).toHaveBeenCalledWith(params);
  });

  it("preserves existing sources on input days", async () => {
    const github = mockProvider("github", [
      { date: "2025-06-15", count: 3, sources: { commits: 2, prs: 1 } },
    ]);

    const result = await aggregate([github], params);
    expect(result[0].sources).toEqual({
      commits: 2,
      prs: 1,
      github: 3,
    });
  });

  it("fetches all providers concurrently", async () => {
    const callOrder: string[] = [];

    const slow: Provider = {
      name: "slow",
      fetchEvents: vi.fn().mockImplementation(async () => {
        callOrder.push("slow-start");
        await new Promise((r) => setTimeout(r, 50));
        callOrder.push("slow-end");
        return [{ date: "2025-06-15", count: 1 }];
      }),
    };

    const fast: Provider = {
      name: "fast",
      fetchEvents: vi.fn().mockImplementation(async () => {
        callOrder.push("fast-start");
        return [{ date: "2025-06-15", count: 2 }];
      }),
    };

    const result = await aggregate([slow, fast], params);
    expect(result).toHaveLength(2);
    expect(callOrder.indexOf("fast-start")).toBeLessThan(callOrder.indexOf("slow-end"));
  });

  it("handles providers returning empty arrays", async () => {
    const empty = mockProvider("empty", []);
    const github = mockProvider("github", [{ date: "2025-06-15", count: 1 }]);

    const result = await aggregate([empty, github], params);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toEqual({ github: 1 });
  });
});

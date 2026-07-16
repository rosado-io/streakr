import { formatDateYYYYMMDD } from "../core/normalize";
import type { ContributionDay, FetchParams } from "../types";
import { parseCliJson, runAuthenticatedCli, runLocalCli, type CliRunner } from "./local-cli";
import { AGENT_TRAILER_RULES } from "./trailers";
import type { Provider } from "./types";
import { toCanonicalDays, validateInputDates } from "./validation";

const PER_PAGE = 100;
const SEARCH_RESULT_CAP = 1000;
const MAX_PAGES = SEARCH_RESULT_CAP / PER_PAGE;

interface CommitSearchItem {
  commit: { author: { date: string } };
}

interface CommitSearchResponse {
  total_count: number;
  items: CommitSearchItem[];
}

export interface GitHubCliCoAuthorProviderOptions {
  agents?: string[];
  host?: string;
  cli?: string;
  runner?: CliRunner;
}

export class GitHubCliCoAuthorProvider implements Provider {
  public readonly name = "github-agents";

  private readonly host: string;
  private readonly cli: string;
  private readonly runner: CliRunner;
  private readonly matches: { key: string; match: string }[];

  public constructor(options: GitHubCliCoAuthorProviderOptions = {}) {
    this.host = options.host ?? "github.com";
    this.cli = options.cli ?? "gh";
    this.runner = options.runner ?? runLocalCli;
    const keys = options.agents ?? AGENT_TRAILER_RULES.map(({ key }) => key);
    this.matches = keys.map((key) => {
      const rule = AGENT_TRAILER_RULES.find((candidate) => candidate.key === key);
      if (!rule) throw new TypeError(`Unknown agent key "${key}"`);
      const match = typeof rule.email === "string" ? rule.email : rule.name;
      if (typeof match !== "string") {
        throw new TypeError(`Agent "${key}" has no searchable co-author match`);
      }
      return { key, match };
    });
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);
    const sourcesByDate = new Map<string, Record<string, number>>();

    for (const { key, match } of this.matches) {
      const items = await this.searchRange(params.user, match, params.start, params.end);
      for (const item of items) {
        const date = item.commit.author.date.slice(0, 10);
        if (date < params.start || date > params.end) continue;
        const sources = sourcesByDate.get(date) ?? {};
        sources[key] = (sources[key] ?? 0) + 1;
        sourcesByDate.set(date, sources);
      }
    }

    return toCanonicalDays(
      [...sourcesByDate].map(([date, sources]) => ({
        date,
        count: Object.values(sources).reduce((sum, count) => sum + count, 0),
        sources,
      })),
      params.start,
      params.end,
    );
  }

  private async searchRange(
    user: string,
    match: string,
    start: string,
    end: string,
  ): Promise<CommitSearchItem[]> {
    const first = await this.searchPage(user, match, start, end, 1);
    if (first.total_count > SEARCH_RESULT_CAP && start !== end) {
      const mid = addDays(start, Math.floor((daysBetween(start, end) - 1) / 2));
      return [
        ...(await this.searchRange(user, match, start, mid)),
        ...(await this.searchRange(user, match, addDays(mid, 1), end)),
      ];
    }

    const items = [...first.items];
    const pages = Math.min(Math.ceil(first.total_count / PER_PAGE), MAX_PAGES);
    for (let page = 2; page <= pages; page += 1) {
      items.push(...(await this.searchPage(user, match, start, end, page)).items);
    }
    return items;
  }

  private async searchPage(
    user: string,
    match: string,
    start: string,
    end: string,
    page: number,
  ): Promise<CommitSearchResponse> {
    const query = `author:${user} "${match}" author-date:${start}..${end}`;
    const output = await runAuthenticatedCli(
      "GitHub",
      `Run \`${this.cli} auth login --hostname ${this.host}\` locally.`,
      this.runner,
      this.cli,
      [
        "api",
        "--hostname",
        this.host,
        "--method",
        "GET",
        "search/commits",
        "-f",
        `q=${query}`,
        "-f",
        `per_page=${PER_PAGE}`,
        "-f",
        `page=${page}`,
      ],
    );
    const payload = parseCliJson<CommitSearchResponse>("GitHub", output);
    return { total_count: payload.total_count ?? 0, items: payload.items ?? [] };
  }
}

const daysBetween = (start: string, end: string): number => {
  const [startY, startM, startD] = start.split("-").map(Number);
  const [endY, endM, endD] = end.split("-").map(Number);
  return (
    Math.round(
      (Date.UTC(endY, endM - 1, endD) - Date.UTC(startY, startM - 1, startD)) / 86_400_000,
    ) + 1
  );
};

const addDays = (date: string, days: number): string => {
  const [year, month, day] = date.split("-").map(Number);
  return formatDateYYYYMMDD(new Date(Date.UTC(year, month - 1, day + days)));
};

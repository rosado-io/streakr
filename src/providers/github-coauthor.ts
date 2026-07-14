import type { ContributionDay, FetchParams } from "../types";
import { formatDateYYYYMMDD } from "../core/normalize";
import type { Provider } from "./types";
import { AGENT_TRAILER_RULES } from "./trailers";
import { validateInputDates, toCanonicalDays } from "./validation";

const SEARCH_COMMITS_ENDPOINT = "https://api.github.com/search/commits";
const PER_PAGE = 100;
const SEARCH_RESULT_CAP = 1000;
const MAX_PAGES = SEARCH_RESULT_CAP / PER_PAGE;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface CommitSearchItem {
  commit: {
    author: {
      date: string;
    };
  };
}

interface CommitSearchResponse {
  total_count: number;
  items: CommitSearchItem[];
}

export interface GitHubCoAuthorProviderOptions {
  token: string;
  agents?: string[];
  endpoint?: string;
  fetch?: FetchLike;
}

export class GitHubCoAuthorProvider implements Provider {
  public readonly name = "github-agents";

  private readonly token: string;
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly matches: { key: string; match: string }[];

  public constructor(options: GitHubCoAuthorProviderOptions) {
    const token = options.token.trim();
    if (token.length === 0) {
      throw new TypeError("GitHubCoAuthorProvider requires a non-empty PAT token");
    }

    const keys = options.agents ?? AGENT_TRAILER_RULES.map((rule) => rule.key);

    this.matches = keys.map((key) => {
      const rule = AGENT_TRAILER_RULES.find((candidate) => candidate.key === key);
      if (!rule) {
        throw new TypeError(`Unknown agent key "${key}"`);
      }
      const match = typeof rule.email === "string" ? rule.email : rule.name;
      if (typeof match !== "string") {
        throw new TypeError(`Agent "${key}" has no searchable co-author match`);
      }
      return { key, match };
    });

    this.token = token;
    this.endpoint = options.endpoint ?? SEARCH_COMMITS_ENDPOINT;
    this.fetchImpl = options.fetch ?? fetch;
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);

    const sourcesByDate = new Map<string, Record<string, number>>();

    for (const { key, match } of this.matches) {
      const items = await this.searchRange(params.user, match, params.start, params.end);
      for (const item of items) {
        const date = item.commit.author.date.slice(0, 10);
        if (date < params.start || date > params.end) continue;
        const bucket = sourcesByDate.get(date) ?? {};
        bucket[key] = (bucket[key] ?? 0) + 1;
        sourcesByDate.set(date, bucket);
      }
    }

    const rawDays: ContributionDay[] = Array.from(sourcesByDate.entries()).map(
      ([date, sources]) => ({
        date,
        count: Object.values(sources).reduce((total, value) => total + value, 0),
        sources,
      }),
    );

    return toCanonicalDays(rawDays, params.start, params.end);
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
      const left = await this.searchRange(user, match, start, mid);
      const right = await this.searchRange(user, match, addDays(mid, 1), end);
      return [...left, ...right];
    }

    const items = [...first.items];
    const pages = Math.min(Math.ceil(first.total_count / PER_PAGE), MAX_PAGES);
    for (let page = 2; page <= pages; page += 1) {
      const next = await this.searchPage(user, match, start, end, page);
      items.push(...next.items);
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
    // The trailer is `Co-Authored-By: Claude <noreply@anthropic.com>`, so the display
    // name sits between the label and the email; searching the email (or name) as a
    // standalone quoted term is what matches, not a phrase glued to the label.
    const query = `author:${user} "${match}" author-date:${start}..${end}`;
    const url = `${this.endpoint}?q=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${page}`;

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "streakr",
      },
    });

    if (!response.ok) {
      const errorBody = (await response.text()).trim();
      const statusText = response.statusText || "Request failed";
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          `GitHub commit search hit a secondary rate limit (${response.status} ${statusText}): ${errorBody}`,
        );
      }
      throw new Error(
        `GitHub commit search request failed (${response.status} ${statusText}): ${errorBody}`,
      );
    }

    const payload = (await response.json()) as CommitSearchResponse;
    return { total_count: payload.total_count ?? 0, items: payload.items ?? [] };
  }
}

const daysBetween = (start: string, end: string): number => {
  const [startY, startM, startD] = start.split("-").map(Number);
  const [endY, endM, endD] = end.split("-").map(Number);
  const startUTC = Date.UTC(startY, startM - 1, startD);
  const endUTC = Date.UTC(endY, endM - 1, endD);
  return Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
};

const addDays = (date: string, days: number): string => {
  const [y, m, d] = date.split("-").map(Number);
  return formatDateYYYYMMDD(new Date(Date.UTC(y, m - 1, d + days)));
};

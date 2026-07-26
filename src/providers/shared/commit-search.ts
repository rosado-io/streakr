import type { ContributionDay, FetchParams } from "../../types";
import { addDays, daysInRange, validateDateRange } from "../../core/date";
import { toCanonicalDays } from "../../core/normalize";
import type { AgentMatch } from "../trailers";

export const PER_PAGE = 100;
const SEARCH_RESULT_CAP = 1000;
const MAX_PAGES = SEARCH_RESULT_CAP / PER_PAGE;

interface CommitSearchItem {
  commit: { author: { date: string } };
}

export interface CommitSearchResponse {
  total_count?: number;
  items?: CommitSearchItem[];
}

export type CommitSearchRequest = (query: string, page: number) => Promise<CommitSearchResponse>;

interface CommitSearchPage {
  total_count: number;
  items: CommitSearchItem[];
}

export const fetchCoAuthorDays = async (
  request: CommitSearchRequest,
  matches: readonly AgentMatch[],
  params: FetchParams,
): Promise<ContributionDay[]> => {
  validateDateRange(params.start, params.end);

  const sourcesByDate = new Map<string, Record<string, number>>();

  for (const { key, match } of matches) {
    const items = await searchRange(request, params.user, match, params.start, params.end);
    for (const item of items) {
      const date = item.commit.author.date.slice(0, 10);
      if (date < params.start || date > params.end) continue;
      const bucket = sourcesByDate.get(date) ?? {};
      bucket[key] = (bucket[key] ?? 0) + 1;
      sourcesByDate.set(date, bucket);
    }
  }

  return toCanonicalDays(
    Array.from(sourcesByDate.entries()).map(([date, sources]) => ({
      date,
      count: Object.values(sources).reduce((total, value) => total + value, 0),
      sources,
    })),
    params.start,
    params.end,
  );
};

const searchRange = async (
  request: CommitSearchRequest,
  user: string,
  match: string,
  start: string,
  end: string,
): Promise<CommitSearchItem[]> => {
  const first = await searchPage(request, user, match, start, end, 1);

  if (first.total_count > SEARCH_RESULT_CAP && start !== end) {
    const mid = addDays(start, Math.floor((daysInRange(start, end) - 1) / 2));
    return [
      ...(await searchRange(request, user, match, start, mid)),
      ...(await searchRange(request, user, match, addDays(mid, 1), end)),
    ];
  }

  const items = [...first.items];
  const pages = Math.min(Math.ceil(first.total_count / PER_PAGE), MAX_PAGES);
  for (let page = 2; page <= pages; page += 1) {
    items.push(...(await searchPage(request, user, match, start, end, page)).items);
  }
  return items;
};

const searchPage = async (
  request: CommitSearchRequest,
  user: string,
  match: string,
  start: string,
  end: string,
  page: number,
): Promise<CommitSearchPage> => {
  const query = `author:${user} "${match}" author-date:${start}..${end}`;
  const payload = await request(query, page);
  return { total_count: payload.total_count ?? 0, items: payload.items ?? [] };
};

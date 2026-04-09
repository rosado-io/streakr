import { normalizeEventsToDaily } from "../core/normalize";
import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

const GITLAB_BASE_URL = "https://gitlab.com";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENTS_PER_PAGE = 100;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface GitLabUser {
  id: number;
  username: string;
}

interface GitLabEvent {
  created_at: string;
}

export interface GitLabProviderOptions {
  /** GitLab Personal Access Token (PAT) used for API auth. */
  token: string;
  /** Base URL for self-hosted GitLab instances. Defaults to https://gitlab.com */
  baseUrl?: string;
  /** Injected fetch implementation for tests. Defaults to global fetch. */
  fetch?: FetchLike;
}

/**
 * GitLab provider using the REST Events API.
 *
 * Supports gitlab.com and self-hosted instances via `baseUrl`.
 * Requires a GitLab PAT with `read_user` and `read_api` scopes in `token`.
 */
export class GitLabProvider implements Provider {
  public readonly name = "gitlab";

  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  public constructor(options: GitLabProviderOptions) {
    const token = options.token.trim();
    if (token.length === 0) {
      throw new Error("GitLabProvider requires a non-empty token");
    }

    this.token = token;
    this.baseUrl = (options.baseUrl ?? GITLAB_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);

    const userId = await this.resolveUserId(params.user);
    const events = await this.fetchAllEvents(userId, params.start, params.end);

    const countsByDate = new Map<string, number>();
    for (const event of events) {
      const date = event.created_at.slice(0, 10);
      if (date >= params.start && date <= params.end) {
        countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
      }
    }

    const rawDays: ContributionDay[] = Array.from(countsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return toCanonicalDays(rawDays, params.start, params.end);
  }

  private async resolveUserId(username: string): Promise<number> {
    const url = `${this.baseUrl}/api/v4/users?username=${encodeURIComponent(username)}`;
    const response = await this.get(url);
    const users = (await response.json()) as GitLabUser[];

    if (users.length === 0) {
      throw new Error(`GitLab user "${username}" not found`);
    }

    return users[0]!.id;
  }

  private async fetchAllEvents(userId: number, start: string, end: string): Promise<GitLabEvent[]> {
    const all: GitLabEvent[] = [];
    let url: string | null =
      `${this.baseUrl}/api/v4/users/${userId}/events` +
      `?after=${start}&before=${end}&per_page=${EVENTS_PER_PAGE}`;

    while (url !== null) {
      const response = await this.get(url);
      const page = (await response.json()) as GitLabEvent[];
      all.push(...page);
      url = nextPageUrl(response.headers);
    }

    return all;
  }

  private async get(url: string): Promise<Response> {
    const response = await this.fetchImpl(url, {
      headers: {
        "PRIVATE-TOKEN": this.token,
        Accept: "application/json",
        "User-Agent": "streakr",
      },
    });

    if (!response.ok) {
      const errorBody = (await response.text()).trim();
      const statusText = response.statusText || "Request failed";
      throw new Error(
        `GitLab API request failed (${response.status} ${statusText}): ${errorBody}`,
      );
    }

    return response;
  }
}

function nextPageUrl(headers: Headers): string | null {
  const link = headers.get("link");
  if (!link) return null;

  for (const part of link.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (match) return match[1]!;
  }

  return null;
}

function validateInputDates(start: string, end: string): void {
  if (!isValidDate(start)) throw new Error(`Invalid start date "${start}" (expected YYYY-MM-DD)`);
  if (!isValidDate(end)) throw new Error(`Invalid end date "${end}" (expected YYYY-MM-DD)`);
  if (start > end) throw new Error(`Invalid range: start "${start}" must be <= end "${end}"`);
}

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function toCanonicalDays(days: ContributionDay[], start: string, end: string): ContributionDay[] {
  if (days.length > 0) return normalizeEventsToDaily(days);

  if (start === end) {
    return normalizeEventsToDaily([{ date: start, count: 0 }]);
  }

  return normalizeEventsToDaily([
    { date: start, count: 0 },
    { date: end, count: 0 },
  ]);
}

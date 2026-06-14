import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";
import { validateInputDates, toCanonicalDays } from "./validation";

const GITLAB_BASE_URL = "https://gitlab.com";
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
  token: string;
  baseUrl?: string;
  fetch?: FetchLike;
}

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

    const countsByDate = events.reduce((acc, event) => {
      const date = event.created_at.slice(0, 10);
      return date >= params.start && date <= params.end
        ? acc.set(date, (acc.get(date) ?? 0) + 1)
        : acc;
    }, new Map<string, number>());

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
    return (
      users[0]?.id ??
      (() => {
        throw new Error(`GitLab user "${username}" not found`);
      })()
    );
  }

  private async fetchAllEvents(userId: number, start: string, end: string): Promise<GitLabEvent[]> {
    const fetchPage = async (url: string | null): Promise<GitLabEvent[]> => {
      if (!url) return [];
      const response = await this.get(url);
      const page = (await response.json()) as GitLabEvent[];
      return [...page, ...(await fetchPage(nextPageUrl(response.headers)))];
    };
    return fetchPage(
      `${this.baseUrl}/api/v4/users/${userId}/events?after=${start}&before=${end}&per_page=${EVENTS_PER_PAGE}`,
    );
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
      throw new Error(`GitLab API request failed (${response.status} ${statusText}): ${errorBody}`);
    }

    return response;
  }
}

const nextPageUrl = (headers: Headers): string | null => {
  const link = headers.get("link");
  return link
    ? (link
        .split(",")
        .filter((part) => part.includes('rel="next"'))
        .map((part) => {
          const start = part.indexOf("<");
          const end = part.indexOf(">");
          return start >= 0 && end > start ? part.slice(start + 1, end) : null;
        })
        .find((url): url is string => url != null) ?? null)
    : null;
};

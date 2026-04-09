import { normalizeEventsToDaily } from "../core/normalize";
import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CONTRIBUTIONS_QUERY = `
  query GitHubContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
    rateLimit {
      limit
      remaining
      resetAt
      cost
    }
  }
`;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  cost: number;
}

interface GraphQLErrorItem {
  message: string;
}

interface ContributionDayNode {
  date: string;
  contributionCount: number;
}

interface ContributionWeekNode {
  contributionDays: ContributionDayNode[];
}

interface GitHubGraphQLResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: ContributionWeekNode[];
        };
      };
    } | null;
    rateLimit?: RateLimitInfo;
  };
  errors?: GraphQLErrorItem[];
}

export interface GitHubProviderOptions {
  /** GitHub Personal Access Token (PAT) used for GraphQL auth. */
  token: string;
  /** Override GraphQL endpoint for testing/proxy scenarios. */
  endpoint?: string;
  /** Injected fetch implementation for tests. Defaults to global fetch. */
  fetch?: FetchLike;
}

/**
 * GitHub provider using GraphQL `contributionsCollection`.
 *
 * Requires a GitHub PAT in `token`.
 */
export class GitHubProvider implements Provider {
  public readonly name = "github";

  private readonly token: string;
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;

  public constructor(options: GitHubProviderOptions) {
    const token = options.token.trim();
    if (token.length === 0) {
      throw new Error("GitHubProvider requires a non-empty PAT token");
    }

    this.token = token;
    this.endpoint = options.endpoint ?? GITHUB_GRAPHQL_ENDPOINT;
    this.fetchImpl = options.fetch ?? fetch;
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "streakr",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: {
          login: params.user,
          from: toGraphQLDateTime(params.start, false),
          to: toGraphQLDateTime(params.end, true),
        },
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.text()).trim();
      const statusText = response.statusText || "Request failed";
      throw new Error(
        `GitHub GraphQL request failed (${response.status} ${statusText}): ${errorBody}`,
      );
    }

    const payload = (await response.json()) as GitHubGraphQLResponse;
    const errors = payload.errors ?? [];

    if (errors.length > 0) {
      const rateLimit = payload.data?.rateLimit;
      const rateLimitSuffix = rateLimit
        ? ` (rateLimit remaining=${rateLimit.remaining}, resetAt=${rateLimit.resetAt})`
        : "";
      throw new Error(
        `GitHub GraphQL error: ${errors.map((e) => e.message).join("; ")}${rateLimitSuffix}`,
      );
    }

    const user = payload.data?.user;
    if (!user) {
      throw new Error(`GitHub user "${params.user}" not found`);
    }

    const weeks = user.contributionsCollection.contributionCalendar.weeks;
    const rawDays = weeks
      .flatMap((week) => week.contributionDays)
      .filter((day) => day.date >= params.start && day.date <= params.end)
      .map<ContributionDay>((day) => ({
        date: day.date,
        count: day.contributionCount,
      }));

    return toCanonicalDays(rawDays, params.start, params.end);
  }
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

function toGraphQLDateTime(date: string, endOfDay: boolean): string {
  return `${date}${endOfDay ? "T23:59:59Z" : "T00:00:00Z"}`;
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

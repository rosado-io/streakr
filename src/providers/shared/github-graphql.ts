import type { ContributionDay, FetchParams } from "../../types";
import { toCanonicalDays } from "../../core/normalize";
import { validateDateRange } from "../../core/date";

export const CONTRIBUTIONS_QUERY = `
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

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  cost: number;
}

export interface GitHubGraphQLResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    } | null;
    rateLimit?: RateLimitInfo;
  };
  errors?: { message: string }[];
}

export interface GitHubGraphQLVariables {
  login: string;
  from: string;
  to: string;
}

export type GitHubGraphQLRequest = (
  variables: GitHubGraphQLVariables,
) => Promise<GitHubGraphQLResponse>;

export const fetchContributionCalendar = async (
  request: GitHubGraphQLRequest,
  params: FetchParams,
): Promise<ContributionDay[]> => {
  validateDateRange(params.start, params.end);

  const days: ContributionDay[] = [];
  for (const range of splitByYear(params.start, params.end)) {
    days.push(...(await fetchRange(request, params.user, range.start, range.end)));
  }
  return toCanonicalDays(days, params.start, params.end);
};

const fetchRange = async (
  request: GitHubGraphQLRequest,
  user: string,
  start: string,
  end: string,
): Promise<ContributionDay[]> => {
  const payload = await request({
    login: user,
    from: `${start}T00:00:00Z`,
    to: `${end}T23:59:59Z`,
  });

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

  const user_ = payload.data?.user;
  if (!user_) throw new Error(`GitHub user "${user}" not found`);

  return user_.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date >= start && day.date <= end)
    .map<ContributionDay>((day) => ({ date: day.date, count: day.contributionCount }));
};

const splitByYear = (start: string, end: string): { start: string; end: string }[] => {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
    const year = startYear + index;
    return {
      start: year === startYear ? start : `${year}-01-01`,
      end: year === endYear ? end : `${year}-12-31`,
    };
  });
};

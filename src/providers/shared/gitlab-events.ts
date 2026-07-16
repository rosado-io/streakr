import type { ContributionDay, FetchParams } from "../../types";
import { validateDateRange } from "../../core/date";
import { toCanonicalDays } from "../../core/normalize";

export const EVENTS_PER_PAGE = 100;

export interface GitLabUser {
  id: number;
  username: string;
}

export interface GitLabEvent {
  created_at: string;
}

export type GitLabRequest = <T>(path: string) => Promise<T>;

export const fetchGitLabDays = async (
  request: GitLabRequest,
  params: FetchParams,
): Promise<ContributionDay[]> => {
  validateDateRange(params.start, params.end);

  const users = await request<GitLabUser[]>(`/users?username=${encodeURIComponent(params.user)}`);
  const userId = users[0]?.id;
  if (userId === undefined) throw new Error(`GitLab user "${params.user}" not found`);

  const counts = new Map<string, number>();
  let page = 1;
  while (true) {
    const events = await request<GitLabEvent[]>(
      `/users/${userId}/events?after=${params.start}&before=${params.end}&per_page=${EVENTS_PER_PAGE}&page=${page}`,
    );
    for (const event of events) {
      const date = event.created_at.slice(0, 10);
      if (date >= params.start && date <= params.end) {
        counts.set(date, (counts.get(date) ?? 0) + 1);
      }
    }
    if (events.length < EVENTS_PER_PAGE) break;
    page += 1;
  }

  return toCanonicalDays(
    [...counts].map(([date, count]) => ({ date, count })),
    params.start,
    params.end,
  );
};

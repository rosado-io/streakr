import type { FetchLike, Provider } from "./types";
import { resolveAgentMatches } from "./trailers";
import {
  fetchCoAuthorDays,
  PER_PAGE,
  type CommitSearchRequest,
  type CommitSearchResponse,
} from "./shared/commit-search";

const SEARCH_COMMITS_ENDPOINT = "https://api.github.com/search/commits";

export interface GitHubCoAuthorProviderOptions {
  token: string;
  agents?: string[];
  endpoint?: string;
  fetch?: FetchLike;
  name?: string;
}

export const githubCoAuthorProvider = (options: GitHubCoAuthorProviderOptions): Provider => {
  const token = options.token.trim();
  if (token.length === 0) {
    throw new Error("githubCoAuthorProvider requires a non-empty PAT token");
  }

  const matches = resolveAgentMatches(options.agents);
  const endpoint = options.endpoint ?? SEARCH_COMMITS_ENDPOINT;
  const fetchImpl = options.fetch ?? fetch;

  const request: CommitSearchRequest = async (query, page) => {
    const url = `${endpoint}?q=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${page}`;
    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
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

    return (await response.json()) as CommitSearchResponse;
  };

  return {
    name: options.name ?? "github-agents",
    fetchEvents: (params) => fetchCoAuthorDays(request, matches, params),
  };
};

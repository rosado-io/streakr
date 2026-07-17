import type { FetchLike, Provider } from "./types";
import {
  CONTRIBUTIONS_QUERY,
  fetchContributionCalendar,
  type GitHubGraphQLRequest,
  type GitHubGraphQLResponse,
} from "./shared/github-graphql";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export interface GitHubProviderOptions {
  token: string;
  endpoint?: string;
  fetch?: FetchLike;
  name?: string;
}

export const githubProvider = (options: GitHubProviderOptions): Provider => {
  const token = options.token.trim();
  if (token.length === 0) {
    throw new Error("githubProvider requires a non-empty PAT token");
  }

  const endpoint = options.endpoint ?? GITHUB_GRAPHQL_ENDPOINT;
  const fetchImpl = options.fetch ?? fetch;

  const request: GitHubGraphQLRequest = async (variables) => {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "streakr",
      },
      body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables }),
    });

    if (!response.ok) {
      const errorBody = (await response.text()).trim();
      const statusText = response.statusText || "Request failed";
      throw new Error(
        `GitHub GraphQL request failed (${response.status} ${statusText}): ${errorBody}`,
      );
    }

    return (await response.json()) as GitHubGraphQLResponse;
  };

  return {
    name: options.name ?? "github",
    fetchEvents: (params) => fetchContributionCalendar(request, params),
  };
};

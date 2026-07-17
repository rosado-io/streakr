import type { FetchLike, Provider } from "./types";
import { fetchGitLabDays, type GitLabRequest } from "./shared/gitlab-events";

const GITLAB_BASE_URL = "https://gitlab.com";

export interface GitLabProviderOptions {
  token: string;
  baseUrl?: string;
  fetch?: FetchLike;
  name?: string;
}

export const gitlabProvider = (options: GitLabProviderOptions): Provider => {
  const token = options.token.trim();
  if (token.length === 0) {
    throw new Error("gitlabProvider requires a non-empty token");
  }

  const baseUrl = (options.baseUrl ?? GITLAB_BASE_URL).replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;

  const request: GitLabRequest = async <T>(path: string): Promise<T> => {
    const response = await fetchImpl(`${baseUrl}/api/v4${path}`, {
      headers: {
        "PRIVATE-TOKEN": token,
        Accept: "application/json",
        "User-Agent": "streakr",
      },
    });

    if (!response.ok) {
      const errorBody = (await response.text()).trim();
      const statusText = response.statusText || "Request failed";
      throw new Error(`GitLab API request failed (${response.status} ${statusText}): ${errorBody}`);
    }

    return (await response.json()) as T;
  };

  return {
    name: options.name ?? "gitlab",
    fetchEvents: (params) => fetchGitLabDays(request, params),
  };
};

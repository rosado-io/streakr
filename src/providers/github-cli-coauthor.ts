import type { CliRunner, Provider } from "./types";
import { parseCliJson, runAuthenticatedCli, runLocalCli } from "./local-cli";
import { resolveAgentMatches } from "./trailers";
import {
  fetchCoAuthorDays,
  PER_PAGE,
  type CommitSearchRequest,
  type CommitSearchResponse,
} from "./shared/commit-search";

export interface GitHubCliCoAuthorProviderOptions {
  agents?: string[];
  host?: string;
  cli?: string;
  runner?: CliRunner;
  name?: string;
}

export const githubCliCoAuthorProvider = (
  options: GitHubCliCoAuthorProviderOptions = {},
): Provider => {
  const matches = resolveAgentMatches(options.agents);
  const host = options.host ?? "github.com";
  const cli = options.cli ?? "gh";
  const runner = options.runner ?? runLocalCli;

  const request: CommitSearchRequest = async (query, page) => {
    const output = await runAuthenticatedCli(
      "GitHub",
      `Run \`${cli} auth login --hostname ${host}\` locally.`,
      runner,
      cli,
      [
        "api",
        "--hostname",
        host,
        "--method",
        "GET",
        "search/commits",
        "-f",
        `q=${query}`,
        "-f",
        `per_page=${PER_PAGE}`,
        "-f",
        `page=${page}`,
      ],
    );
    return parseCliJson<CommitSearchResponse>("GitHub", output);
  };

  return {
    name: options.name ?? "github-agents",
    fetchEvents: (params) => fetchCoAuthorDays(request, matches, params),
  };
};

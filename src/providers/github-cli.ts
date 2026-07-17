import type { CliRunner, Provider } from "./types";
import { parseCliJson, runAuthenticatedCli, runLocalCli } from "./local-cli";
import {
  CONTRIBUTIONS_QUERY,
  fetchContributionCalendar,
  type GitHubGraphQLRequest,
  type GitHubGraphQLResponse,
} from "./shared/github-graphql";

export interface GitHubCliProviderOptions {
  host?: string;
  cli?: string;
  runner?: CliRunner;
  name?: string;
}

export const githubCliProvider = (options: GitHubCliProviderOptions = {}): Provider => {
  const host = options.host ?? "github.com";
  const cli = options.cli ?? "gh";
  const runner = options.runner ?? runLocalCli;

  const request: GitHubGraphQLRequest = async (variables) => {
    const output = await runAuthenticatedCli(
      "GitHub",
      `Run \`${cli} auth login --hostname ${host}\` locally.`,
      runner,
      cli,
      [
        "api",
        "--hostname",
        host,
        "graphql",
        "-f",
        `query=${CONTRIBUTIONS_QUERY}`,
        "-F",
        `login=${variables.login}`,
        "-F",
        `from=${variables.from}`,
        "-F",
        `to=${variables.to}`,
      ],
    );
    return parseCliJson("GitHub", output) as GitHubGraphQLResponse;
  };

  return {
    name: options.name ?? "github",
    fetchEvents: (params) => fetchContributionCalendar(request, params),
  };
};

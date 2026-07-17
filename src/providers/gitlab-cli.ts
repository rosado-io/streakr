import type { CliRunner, Provider } from "./types";
import { parseCliJson, runAuthenticatedCli, runLocalCli } from "./local-cli";
import { fetchGitLabDays, type GitLabRequest } from "./shared/gitlab-events";

export interface GitLabCliProviderOptions {
  host?: string;
  cli?: string;
  runner?: CliRunner;
  name?: string;
}

export const gitlabCliProvider = (options: GitLabCliProviderOptions = {}): Provider => {
  const host = options.host ?? "gitlab.com";
  const cli = options.cli ?? "glab";
  const runner = options.runner ?? runLocalCli;

  const request: GitLabRequest = async <T>(path: string): Promise<T> => {
    const output = await runAuthenticatedCli(
      "GitLab",
      `Run \`${cli} auth login --hostname ${host} --use-keyring\` locally.`,
      runner,
      cli,
      ["api", "--hostname", host, path],
    );
    return parseCliJson("GitLab", output) as T;
  };

  return {
    name: options.name ?? "gitlab",
    fetchEvents: (params) => fetchGitLabDays(request, params),
  };
};

import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";
import { parseCliJson, runAuthenticatedCli, runLocalCli, type CliRunner } from "./local-cli";
import { toCanonicalDays, validateInputDates } from "./validation";

const CONTRIBUTIONS_QUERY = `
query GitHubContributions($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

interface GitHubCliResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

export interface GitHubCliProviderOptions {
  host?: string;
  cli?: string;
  runner?: CliRunner;
}

export class GitHubCliProvider implements Provider {
  public readonly name = "github";

  private readonly host: string;
  private readonly cli: string;
  private readonly runner: CliRunner;

  public constructor(options: GitHubCliProviderOptions = {}) {
    this.host = options.host ?? "github.com";
    this.cli = options.cli ?? "gh";
    this.runner = options.runner ?? runLocalCli;
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);
    const output = await runAuthenticatedCli(
      "GitHub",
      `Run \`${this.cli} auth login --hostname ${this.host}\` locally.`,
      this.runner,
      this.cli,
      [
        "api",
        "--hostname",
        this.host,
        "graphql",
        "-f",
        `query=${CONTRIBUTIONS_QUERY}`,
        "-F",
        `login=${params.user}`,
        "-F",
        `from=${params.start}T00:00:00Z`,
        "-F",
        `to=${params.end}T23:59:59Z`,
      ],
    );
    const payload = parseCliJson<GitHubCliResponse>("GitHub", output);
    if (payload.errors?.length) {
      throw new Error(
        `GitHub GraphQL error: ${payload.errors.map(({ message }) => message).join("; ")}`,
      );
    }
    if (!payload.data?.user) throw new Error(`GitHub user "${params.user}" not found`);

    const days = payload.data.user.contributionsCollection.contributionCalendar.weeks
      .flatMap(({ contributionDays }) => contributionDays)
      .filter(({ date }) => date >= params.start && date <= params.end)
      .map<ContributionDay>(({ date, contributionCount }) => ({
        date,
        count: contributionCount,
      }));
    return toCanonicalDays(days, params.start, params.end);
  }
}

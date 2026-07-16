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
    const days: ContributionDay[] = [];
    for (const range of splitByYear(params.start, params.end)) {
      days.push(...(await this.fetchRange(params.user, range.start, range.end)));
    }
    return toCanonicalDays(days, params.start, params.end);
  }

  private async fetchRange(user: string, start: string, end: string): Promise<ContributionDay[]> {
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
        `login=${user}`,
        "-F",
        `from=${start}T00:00:00Z`,
        "-F",
        `to=${end}T23:59:59Z`,
      ],
    );
    const payload = parseCliJson<GitHubCliResponse>("GitHub", output);
    if (payload.errors?.length) {
      throw new Error(
        `GitHub GraphQL error: ${payload.errors.map(({ message }) => message).join("; ")}`,
      );
    }
    if (!payload.data?.user) throw new Error(`GitHub user "${user}" not found`);

    return payload.data.user.contributionsCollection.contributionCalendar.weeks
      .flatMap(({ contributionDays }) => contributionDays)
      .filter(({ date }) => date >= start && date <= end)
      .map<ContributionDay>(({ date, contributionCount }) => ({
        date,
        count: contributionCount,
      }));
  }
}

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

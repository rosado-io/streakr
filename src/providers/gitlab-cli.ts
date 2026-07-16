import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";
import { parseCliJson, runAuthenticatedCli, runLocalCli, type CliRunner } from "./local-cli";
import { toCanonicalDays, validateInputDates } from "./validation";

const EVENTS_PER_PAGE = 100;

interface GitLabUser {
  id: number;
  username: string;
}

interface GitLabEvent {
  created_at: string;
}

export interface GitLabCliProviderOptions {
  host?: string;
  cli?: string;
  runner?: CliRunner;
}

export class GitLabCliProvider implements Provider {
  public readonly name = "gitlab";

  private readonly host: string;
  private readonly cli: string;
  private readonly runner: CliRunner;

  public constructor(options: GitLabCliProviderOptions = {}) {
    this.host = options.host ?? "gitlab.com";
    this.cli = options.cli ?? "glab";
    this.runner = options.runner ?? runLocalCli;
  }

  public async fetchEvents(params: FetchParams): Promise<ContributionDay[]> {
    validateInputDates(params.start, params.end);
    const users = await this.get<GitLabUser[]>(
      `/users?username=${encodeURIComponent(params.user)}`,
    );
    const userId = users[0]?.id;
    if (userId === undefined) throw new Error(`GitLab user "${params.user}" not found`);

    const counts = new Map<string, number>();
    let page = 1;
    while (true) {
      const events = await this.get<GitLabEvent[]>(
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
  }

  private async get<T>(endpoint: string): Promise<T> {
    const output = await runAuthenticatedCli(
      "GitLab",
      `Run \`${this.cli} auth login --hostname ${this.host} --use-keyring\` locally.`,
      this.runner,
      this.cli,
      ["api", "--hostname", this.host, endpoint],
    );
    return parseCliJson<T>("GitLab", output);
  }
}

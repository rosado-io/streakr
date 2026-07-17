import type { ContributionDay, FetchParams } from "../types";

export interface Provider {
  readonly name: string;
  fetchEvents(params: FetchParams): Promise<ContributionDay[]>;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type CliRunner = (executable: string, args: readonly string[]) => Promise<string>;

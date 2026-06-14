import type { ContributionDay, FetchParams } from "../types";

export interface Provider {
  readonly name: string;
  fetchEvents(params: FetchParams): Promise<ContributionDay[]>;
}

import type { ContributionDay, FetchParams } from "../types";

/** Interface that all data providers must implement. */
export interface Provider {
  /** Unique name for this provider (e.g. "github", "gitlab") */
  readonly name: string;

  /** Fetch raw events from the provider's API. */
  fetchEvents(params: FetchParams): Promise<ContributionDay[]>;
}

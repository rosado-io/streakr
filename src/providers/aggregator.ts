import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

/**
 * Aggregates contribution data from multiple providers.
 * Merges events by date and sums counts.
 */
export async function aggregate(
  _providers: Provider[],
  _params: FetchParams,
): Promise<ContributionDay[]> {
  // TODO: Implement in STR-13
  return [];
}

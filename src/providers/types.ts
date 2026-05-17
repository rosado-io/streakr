import type { ContributionDay, FetchParams } from "../types";

/**
 * Interface implemented by contribution data providers.
 *
 * Providers are responsible for fetching or deriving activity for one source
 * and returning Streakr's normalized `ContributionDay` shape. Provider output
 * may contain gaps or duplicate dates; callers can pass the result through
 * `normalizeEventsToDaily()` before computing streaks or rendering grids.
 */
export interface Provider {
  /** Unique source name used as the `sources` key (e.g. `"github"`). */
  readonly name: string;

  /**
   * Fetches contribution events for a user and inclusive date range.
   *
   * @param params - Username plus `YYYY-MM-DD` `start` and `end` dates.
   * @returns Contribution days for this provider.
   * @throws Provider-specific errors when authentication, validation, or
   * network requests fail.
   */
  fetchEvents(params: FetchParams): Promise<ContributionDay[]>;
}

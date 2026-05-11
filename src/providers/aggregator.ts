import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

/**
 * Aggregates contribution data from multiple providers.
 *
 * Fetches events from all providers concurrently using `Promise.allSettled`,
 * tags each result with the provider's name in the `sources` field,
 * and merges all events into a single flat array.
 *
 * Failed providers are silently skipped (their errors are not thrown).
 * Use the returned array with `normalizeEventsToDaily()` for a clean daily series.
 *
 * @param providers - Array of Provider implementations to fetch from
 * @param params - Fetch parameters (user, start, end dates)
 * @returns Merged array of ContributionDay from all successful providers
 */
export async function aggregate(
  providers: Provider[],
  params: FetchParams,
): Promise<ContributionDay[]> {
  const results = await Promise.allSettled(
    providers.map((provider) => provider.fetchEvents(params)),
  );

  return results.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];

    const providerName = providers[index].name;
    return result.value.map((day) => ({
      date: day.date,
      count: day.count,
      sources: {
        ...day.sources,
        [providerName]: (day.sources?.[providerName] ?? 0) + day.count,
      },
    }));
  });
}

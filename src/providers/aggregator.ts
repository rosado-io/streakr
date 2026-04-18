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
  if (providers.length === 0) return [];

  const results = await Promise.allSettled(
    providers.map((provider) => provider.fetchEvents(params)),
  );

  const merged: ContributionDay[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;

    const providerName = providers[i].name;

    for (const day of result.value) {
      const sources: Record<string, number> = {
        ...day.sources,
        [providerName]: (day.sources?.[providerName] ?? 0) + day.count,
      };

      merged.push({
        date: day.date,
        count: day.count,
        sources,
      });
    }
  }

  return merged;
}

import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

export const aggregate = async (
  providers: Provider[],
  params: FetchParams,
): Promise<ContributionDay[]> => {
  const results = await Promise.allSettled(
    providers.map((provider) => provider.fetchEvents(params)),
  );

  return providers.flatMap((provider, index) => {
    const result = results[index];
    if (!result || result.status !== "fulfilled") return [];
    return result.value.map((day) => ({
      date: day.date,
      count: day.count,
      sources: {
        ...day.sources,
        [provider.name]: (day.sources?.[provider.name] ?? 0) + day.count,
      },
    }));
  });
};

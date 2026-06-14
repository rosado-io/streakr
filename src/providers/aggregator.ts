import type { ContributionDay, FetchParams } from "../types";
import type { Provider } from "./types";

export const aggregate = async (
  providers: Provider[],
  params: FetchParams,
): Promise<ContributionDay[]> => {
  const results = await Promise.allSettled(
    providers.map((provider) => provider.fetchEvents(params)),
  );

  return results.flatMap((result, index) =>
    result.status === "fulfilled"
      ? result.value.map((day) => ({
          date: day.date,
          count: day.count,
          sources: {
            ...day.sources,
            [providers[index].name]: (day.sources?.[providers[index].name] ?? 0) + day.count,
          },
        }))
      : [],
  );
};

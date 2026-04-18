import type { ContributionDay } from "../../src/index";
import type { Messages } from "../i18n";

export function describeCadence(series: ContributionDay[], msg: Messages): string {
  const recentWindow = series.slice(-14);
  const contributions = recentWindow.reduce((sum, day) => sum + day.count, 0);
  if (contributions >= 45) return msg.cadenceHigh;
  if (contributions >= 24) return msg.cadenceMedium;
  return msg.cadenceLow;
}

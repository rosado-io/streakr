import { padDaysToYear } from "../calendar";
import { h } from "../dom";

export const statCard = (label: string, value: string | number, suffix?: string): HTMLElement =>
  h("div", { class: "sk-stat" }, [
    h("div", { class: "sk-stat-label", text: label }),
    h("div", { class: "sk-stat-value" }, [
      document.createTextNode(String(value)),
      suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
    ]),
  ]);

export const loadingStatCard = (label: string, suffix?: string, digits: 2 | 3 = 2): HTMLElement =>
  h("div", { class: "sk-stat" }, [
    h("div", { class: "sk-stat-label", text: label }),
    h("div", { class: "sk-stat-value sk-stat-value--loading" }, [
      h("span", {
        class: `sk-skeleton sk-stat-value-skeleton sk-stat-value-skeleton--${digits}`,
        "aria-hidden": true,
      }),
      suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
    ]),
  ]);

export const formatActiveRate = (activeDays: number, year: number | null): string => {
  if (year == null) return "0";
  const totalDays = padDaysToYear([], year).length;
  return ((activeDays / totalDays) * 100).toFixed(1);
};

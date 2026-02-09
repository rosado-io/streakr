import type { Theme } from "../types";

/** Classic green theme (GitHub-style). */
const classicGreen: Theme = {
  colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  background: "#ffffff",
  textColor: "#24292e",
  borderRadius: 2,
};

/** Dark theme. */
const dark: Theme = {
  colors: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  background: "#0d1117",
  textColor: "#c9d1d9",
  borderRadius: 2,
};

/** Built-in theme presets. */
export const themes = {
  classicGreen,
  dark,
} as const;

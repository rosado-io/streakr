/* global console, process */
// Bundle size guard: the library's value proposition is being lightweight, so
// fail CI if the published artifacts grow past these budgets (in bytes).
import { statSync } from "node:fs";

const BUDGETS = [
  ["dist/streakr.js", 70 * 1024],
  ["dist/streakr.css", 28 * 1024],
];

let overBudget = false;

for (const [file, budget] of BUDGETS) {
  const size = statSync(new URL(`../${file}`, import.meta.url)).size;
  const ok = size <= budget;
  if (!ok) overBudget = true;
  console.log(
    `${file}: ${(size / 1024).toFixed(1)} kB of ${(budget / 1024).toFixed(0)} kB ${ok ? "ok" : "OVER BUDGET"}`,
  );
}

if (overBudget) {
  console.error("Bundle size budget exceeded.");
  process.exit(1);
}

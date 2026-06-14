import { svg } from "./dom";

export const logoR = (): SVGElement => {
  const fill = "var(--sk-heat-4, #39d353)";
  const hole = "var(--sk-heat-1, #0e4429)";
  const cells: [number, number, string][] = [
    [1, 1, fill],
    [7, 1, fill],
    [13, 1, fill],
    [1, 7, fill],
    [7, 7, fill],
    [13, 7, hole],
    [1, 13, fill],
    [7, 13, hole],
    [13, 13, fill],
  ];

  return svg(
    "svg",
    { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none" },
    cells.map(([x, y, cellFill]) =>
      svg("rect", { x, y, width: 4, height: 4, rx: 1, fill: cellFill }),
    ),
  );
};

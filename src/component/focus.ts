// Restore semantic focus after replacing nodes, including responsive view changes.
export const captureFocus = (root: HTMLElement): (() => void) => {
  const active = document.activeElement;
  const key = active?.getAttribute("data-sk-focus");
  const date = active?.getAttribute("data-date");
  if (!active || !root.contains(active) || (!key && !date)) return () => {};
  return () => {
    const candidates = root.querySelectorAll<HTMLElement | SVGElement>(
      "[data-sk-focus], [data-date]",
    );
    const next = Array.from(candidates).find((el) =>
      key ? el.getAttribute("data-sk-focus") === key : el.getAttribute("data-date") === date,
    );
    if (!next || next.getAttribute("data-future") === "true") return;
    if (date) {
      root
        .querySelectorAll('[data-date][tabindex="0"]')
        .forEach((el) => el.setAttribute("tabindex", "-1"));
      next.setAttribute("tabindex", "0");
    }
    next.focus({ preventScroll: true });
  };
};

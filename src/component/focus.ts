// Restore semantic focus after replacing nodes, including responsive view changes.
export const captureFocus = (root: HTMLElement): (() => void) => {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement || active instanceof SVGElement) || !root.contains(active)) {
    return () => {};
  }
  const key = active.dataset.skFocus;
  const date = active.dataset.date;
  if (!key && !date) return () => {};
  return () => {
    const candidates = root.querySelectorAll<HTMLElement | SVGElement>(
      "[data-sk-focus], [data-date]",
    );
    const next = Array.from(candidates).find((el) =>
      key ? el.dataset.skFocus === key : el.dataset.date === date,
    );
    if (!next || next.dataset.future === "true") return;
    if (date) {
      root
        .querySelectorAll('[data-date][tabindex="0"]')
        .forEach((el) => el.setAttribute("tabindex", "-1"));
      next.setAttribute("tabindex", "0");
    }
    next.focus({ preventScroll: true });
  };
};

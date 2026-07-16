import { h, trustedHtml } from "./dom";

export interface YearModalOptions {
  years: number[];
  currentYear: number | null;
  onSelect: (year: number) => void;
  onClose: () => void;
}

export const renderYearModal = (card: Element, options: YearModalOptions): void => {
  const { years, currentYear, onSelect, onClose } = options;
  const overlay = h("div", { class: "sk-modal-overlay", onclick: () => onClose() });
  const modal = h("div", {
    class: "sk-modal",
    role: "dialog",
    "aria-modal": true,
    "aria-label": "Select year",
    onclick: (e: Event) => e.stopPropagation(),
  });
  modal.appendChild(
    h("div", { class: "sk-modal-header" }, [
      h("div", { class: "sk-modal-title", text: "Select year" }),
      h("button", {
        class: "sk-modal-close",
        "aria-label": "Close",
        onclick: () => onClose(),
        html: trustedHtml(
          '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        ),
      }),
    ]),
  );
  const grid = h("div", { class: "sk-modal-grid" });
  years
    .slice()
    .reverse()
    .forEach((y) => {
      grid.appendChild(
        h(
          "button",
          {
            class: "sk-modal-year" + (currentYear === y ? " active" : ""),
            onclick: () => {
              onSelect(y);
              onClose();
            },
          },
          [h("div", { class: "sk-modal-year-num", text: String(y) })],
        ),
      );
    });
  modal.appendChild(grid);

  const trapFocus = (e: KeyboardEvent): void => {
    if (e.key !== "Tab") return;
    const focusables = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  modal.addEventListener("keydown", trapFocus);

  overlay.appendChild(modal);
  card.appendChild(overlay);
};

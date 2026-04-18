import { locales, type Locale } from "../i18n";

export function detectLocale(): Locale {
  const saved = localStorage.getItem("streakr-locale") as Locale | null;
  if (saved && saved in locales) return saved;
  const browser = navigator.language.split("-")[0] as Locale;
  return browser in locales ? browser : "en";
}

export function applyText(key: string, value: string): void {
  document.querySelectorAll<HTMLElement>(`[data-i18n="${key}"]`).forEach((el) => {
    el.textContent = value;
  });
}

export function applyHtml(key: string, value: string): void {
  document.querySelectorAll<HTMLElement>(`[data-i18n-html="${key}"]`).forEach((el) => {
    el.innerHTML = value;
  });
}

export function applyOptionText(select: HTMLSelectElement, value: string, label: string): void {
  const option = select.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
  if (option) option.textContent = label;
}

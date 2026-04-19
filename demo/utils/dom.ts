import { locales, type Locale } from "../i18n";

const SPANISH_TIMEZONES = new Set([
  "America/Mexico_City", "America/Monterrey", "America/Merida", "America/Mazatlan",
  "America/Chihuahua", "America/Hermosillo", "America/Tijuana", "America/Cancun",
  "America/Bogota", "America/Lima", "America/Santiago", "America/Caracas",
  "America/Guayaquil", "America/La_Paz", "America/Asuncion", "America/Montevideo",
  "America/Panama", "America/Costa_Rica", "America/Guatemala", "America/Managua",
  "America/Tegucigalpa", "America/El_Salvador", "America/Santo_Domingo",
  "America/Havana", "America/Argentina/Buenos_Aires", "America/Argentina/Cordoba",
  "America/Argentina/Mendoza", "Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta",
]);

function detectLocaleFromTimezone(): Locale | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return SPANISH_TIMEZONES.has(tz) ? "es" : null;
  } catch {
    return null;
  }
}

export function detectLocale(): Locale {
  const saved = localStorage.getItem("streakr-locale") as Locale | null;
  if (saved && saved in locales) return saved;
  const browser = navigator.language.split("-")[0] as Locale;
  if (browser in locales) return browser;
  const fromTz = detectLocaleFromTimezone();
  return fromTz ?? "en";
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

import { locales, type Locale } from "../i18n";

const SPANISH_TIMEZONES = new Set([
  "Africa/Malabo", "Africa/Ceuta",
  "America/Mexico_City", "America/Monterrey", "America/Merida", "America/Mazatlan",
  "America/Chihuahua", "America/Hermosillo", "America/Tijuana", "America/Cancun",
  "America/Bahia_Banderas", "America/Ciudad_Juarez", "America/Matamoros", "America/Ojinaga",
  "America/Bogota", "America/Lima", "America/Santiago", "America/Caracas",
  "America/Punta_Arenas", "Pacific/Easter", "America/Guayaquil", "Pacific/Galapagos",
  "America/La_Paz", "America/Asuncion", "America/Montevideo", "America/Puerto_Rico",
  "America/Panama", "America/Costa_Rica", "America/Guatemala", "America/Managua",
  "America/Tegucigalpa", "America/El_Salvador", "America/Santo_Domingo", "America/Havana",
  "America/Argentina/Buenos_Aires", "America/Argentina/Catamarca", "America/Argentina/Cordoba",
  "America/Argentina/Jujuy", "America/Argentina/La_Rioja", "America/Argentina/Mendoza",
  "America/Argentina/Rio_Gallegos", "America/Argentina/Salta", "America/Argentina/San_Juan",
  "America/Argentina/San_Luis", "America/Argentina/Tucuman", "America/Argentina/Ushuaia",
  "Europe/Madrid", "Atlantic/Canary",
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

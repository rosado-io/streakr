export type Locale = "en" | "es";

export interface Messages {
  eyebrow: string;
  heroHeading: string;
  heroParagraph: string;
  labelTheme: string;
  optionClassicGreen: string;
  optionDark: string;
  optionSystem: string;
  optionCssVars: string;
  labelSize: string;
  optionSmall: string;
  optionMedium: string;
  optionLarge: string;
  badgeGithub: string;
  badgeGitlab: string;
  badgePrivacy: string;
  snapshotTitle: string;
  snapshotStrong: (total: number) => string;
  snapshotCadenceSuffix: (activeDays: number) => string;
  snapshotPeak: (date: string, count: number) => string;
  snapshotGithub: (n: number) => string;
  snapshotGitlab: (n: number) => string;
  sectionLabel: string;
  calendarHeading: string;
  calendarSubtitle: (range: string) => string;
  legendLess: string;
  legendMore: string;
  labelLanguage: string;
  cadenceHigh: string;
  cadenceMedium: string;
  cadenceLow: string;
}

const en: Messages = {
  eyebrow: "Streakr Demo",
  heroHeading: "See one streak graph across GitHub and GitLab.",
  heroParagraph:
    "Streakr combines your contributions from GitHub and GitLab into a single, beautiful chart. This demo shows your unified activity rendered instantly—no API tokens required to preview. Your credentials stay private until you choose to connect.",
  labelTheme: "Theme",
  optionClassicGreen: "Classic Green",
  optionDark: "Dark",
  optionSystem: "System",
  optionCssVars: "CSS Variables",
  labelSize: "Size",
  optionSmall: "Small",
  optionMedium: "Medium",
  optionLarge: "Large",
  badgeGithub: "GitHub ready",
  badgeGitlab: "GitLab ready",
  badgePrivacy: "Privacy-first",
  snapshotTitle: "Snapshot",
  snapshotStrong: (total) => `${total} contributions in the last 30 days`,
  snapshotCadenceSuffix: (activeDays) => `across ${activeDays} active days in this period.`,
  snapshotPeak: (date, count) => `Peak day: ${date} · ${count}`,
  snapshotGithub: (n) => `GitHub share: ${n}`,
  snapshotGitlab: (n) => `GitLab share: ${n}`,
  sectionLabel: "Unified Activity",
  calendarHeading: "One contribution story across providers",
  calendarSubtitle: (range) =>
    `Your activity from ${range}. Rendered as a crisp, framework-agnostic SVG that matches your chosen theme perfectly.`,
  legendLess: "Less",
  legendMore: "More",
  labelLanguage: "Language",
  cadenceHigh: "Shipping almost daily",
  cadenceMedium: "Healthy weekly rhythm",
  cadenceLow: "Early but consistent",
};

const es: Messages = {
  eyebrow: "Demo de Streakr",
  heroHeading: "Un solo gráfico de actividad para GitHub y GitLab.",
  heroParagraph:
    "Streakr une tus contribuciones de GitHub y GitLab en un solo gráfico elegante. Esta demo muestra tu actividad unificada al instante—sin necesidad de tokens de API para probar. Tus credenciales permanecen privadas hasta que decidas conectar.",
  labelTheme: "Tema",
  optionClassicGreen: "Verde clásico",
  optionDark: "Oscuro",
  optionSystem: "Sistema",
  optionCssVars: "Variables CSS",
  labelSize: "Tamaño",
  optionSmall: "Pequeño",
  optionMedium: "Mediano",
  optionLarge: "Grande",
  badgeGithub: "GitHub listo",
  badgeGitlab: "GitLab listo",
  badgePrivacy: "Privacidad primero",
  snapshotTitle: "Resumen",
  snapshotStrong: (total) => `${total} contribuciones en los últimos 30 días`,
  snapshotCadenceSuffix: (activeDays) =>
    `en ${activeDays} días activos en este periodo.`,
  snapshotPeak: (date, count) => `Día pico: ${date} · ${count}`,
  snapshotGithub: (n) => `Aportaciones en GitHub: ${n}`,
  snapshotGitlab: (n) => `Aportaciones en GitLab: ${n}`,
  sectionLabel: "Actividad unificada",
  calendarHeading: "Una historia de contribuciones en todos los proveedores",
  calendarSubtitle: (range) =>
    `Tu actividad del ${range}. Renderizada como un SVG nítido y agnóstico al framework que se adapta perfectamente a tu tema elegido.`,
  legendLess: "Menos",
  legendMore: "Más",
  labelLanguage: "Idioma",
  cadenceHigh: "Enviando casi a diario",
  cadenceMedium: "Ritmo semanal saludable",
  cadenceLow: "Apenas comenzando pero constante",
};

export const locales: Record<Locale, Messages> = { en, es };

export const localeMeta: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇲🇽" },
};

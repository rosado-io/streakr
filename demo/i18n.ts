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
    "This page ships with deterministic sample activity so <code>pnpm dev</code> renders immediately. It behaves like a product preview, not a token wall: no credentials are requested, stored, or sent anywhere by default.",
  labelTheme: "Theme",
  optionClassicGreen: "Classic Green",
  optionDark: "Dark",
  optionSystem: "System",
  optionCssVars: "CSS Variables",
  labelSize: "Size",
  optionSmall: "Small",
  optionMedium: "Medium",
  optionLarge: "Large",
  badgeGithub: "GitHub mock",
  badgeGitlab: "GitLab mock",
  badgePrivacy: "Privacy-first",
  snapshotTitle: "Snapshot",
  snapshotStrong: (total) => `${total} contributions in the last 30 days`,
  snapshotCadenceSuffix: (activeDays) => `across ${activeDays} active days in this sample window.`,
  snapshotPeak: (date, count) => `Peak day: ${date} · ${count}`,
  snapshotGithub: (n) => `GitHub share: ${n}`,
  snapshotGitlab: (n) => `GitLab share: ${n}`,
  sectionLabel: "Unified Activity",
  calendarHeading: "One contribution story across providers",
  calendarSubtitle: (range) =>
    `Mock activity from ${range}. Rendered as framework-agnostic SVG with the same theme system exposed by the library.`,
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
    "Esta página usa datos de muestra deterministas para que <code>pnpm dev</code> renderice de inmediato. Funciona como una vista previa del producto, no como una barrera de tokens: no se solicitan, almacenan ni envían credenciales por defecto.",
  labelTheme: "Tema",
  optionClassicGreen: "Verde clásico",
  optionDark: "Oscuro",
  optionSystem: "Sistema",
  optionCssVars: "Variables CSS",
  labelSize: "Tamaño",
  optionSmall: "Pequeño",
  optionMedium: "Mediano",
  optionLarge: "Grande",
  badgeGithub: "Mock de GitHub",
  badgeGitlab: "Mock de GitLab",
  badgePrivacy: "Privacidad primero",
  snapshotTitle: "Resumen",
  snapshotStrong: (total) => `${total} contribuciones en los últimos 30 días`,
  snapshotCadenceSuffix: (activeDays) =>
    `en ${activeDays} días activos en esta ventana de muestra.`,
  snapshotPeak: (date, count) => `Día pico: ${date} · ${count}`,
  snapshotGithub: (n) => `Aportaciones en GitHub: ${n}`,
  snapshotGitlab: (n) => `Aportaciones en GitLab: ${n}`,
  sectionLabel: "Actividad unificada",
  calendarHeading: "Una historia de contribuciones en todos los proveedores",
  calendarSubtitle: (range) =>
    `Actividad simulada del ${range}. Renderizada como SVG agnóstico al framework con el mismo sistema de temas expuesto por la librería.`,
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

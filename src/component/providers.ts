import type { StreakrProvider, StreakrProviders } from "../types";

const BUILTIN_ICONS: Record<string, string> = {
  github:
    '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  gitlab:
    '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M8 14.7L10.95 5.6H5.05L8 14.7z" fill="#e24329"/><path d="M8 14.7L5.05 5.6H.92L8 14.7z" fill="#fc6d26"/><path d="M.92 5.6L.02 8.36c-.08.25 0 .53.22.69L8 14.7.92 5.6z" fill="#fca326"/><path d="M.92 5.6h4.13L3.27.1c-.09-.27-.48-.27-.57 0L.92 5.6z" fill="#e24329"/><path d="M8 14.7l2.95-9.1h4.13L8 14.7z" fill="#fc6d26"/><path d="M15.08 5.6l.9 2.76c.08.25 0 .53-.22.69L8 14.7l7.08-9.1z" fill="#fca326"/><path d="M15.08 5.6h-4.13L12.73.1c.09-.27.48-.27.57 0l1.78 5.5z" fill="#e24329"/></svg>',
  bitbucket:
    '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M.51 1.18c-.27 0-.51.24-.51.51 0 .03 0 .07.01.1l2.18 13.17c.06.36.37.62.74.63h10.46c.27 0 .51-.2.55-.47l2.18-13.32a.512.512 0 00-.41-.59L.6 1.18zm9.13 9.42H6.4l-.88-4.55h4.92l-.8 4.55z" fill="#2684ff"/></svg>',
};

export const DEFAULT_PROVIDERS: StreakrProvider[] = [
  { key: "github", name: "GitHub", color: "#39d353" },
  { key: "gitlab", name: "GitLab", color: "#fc6d26" },
  { key: "bitbucket", name: "Bitbucket", color: "#2684ff" },
];

export const providerIconHtml = (provider: StreakrProvider): string | null =>
  provider.icon ?? BUILTIN_ICONS[provider.key] ?? null;

export const enabledProviderState = (providers: StreakrProvider[]): StreakrProviders =>
  Object.fromEntries(providers.map(({ key }) => [key, true]));

export const syncProviderState = (
  providers: StreakrProvider[],
  current: StreakrProviders,
): StreakrProviders => Object.fromEntries(providers.map(({ key }) => [key, current[key] ?? true]));

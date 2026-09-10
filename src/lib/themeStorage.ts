export type ThemePreference = "dark" | "light";

const THEME_KEY = "theme";

export function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: ThemePreference): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Safari can block website storage. The selected theme still applies for
    // the open page, but cannot be persisted for a later visit.
  }
}

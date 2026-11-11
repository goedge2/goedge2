import { create } from "zustand";

export const THEME_MODE_STORAGE_KEY = "theme-mode";

export const THEME_MODES = ["light", "dark", "auto"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export type ThemeState = {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (themeMode: ThemeMode) => void;
};

export function normalizeThemeMode(storedValue: string | null | undefined): ThemeMode {
  if (THEME_MODES.includes(storedValue as ThemeMode)) {
    return storedValue as ThemeMode;
  }

  if (storedValue === "true") {
    return "dark";
  }

  if (storedValue === "false") {
    return "light";
  }

  return "auto";
}

export function resolveThemeIsDark(themeMode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (themeMode === "dark") {
    return true;
  }

  if (themeMode === "light") {
    return false;
  }

  return systemPrefersDark;
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  try {
    const storedValue = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    const themeMode = normalizeThemeMode(storedValue);

    if (storedValue !== themeMode) {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    }

    return themeMode;
  } catch {
    return "auto";
  }
}

const initialThemeMode = readInitialThemeMode();

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: initialThemeMode,
  isDarkMode: resolveThemeIsDark(initialThemeMode, getSystemPrefersDark()),
  setThemeMode: (themeMode) => {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // ignore storage errors
    }

    set({
      themeMode,
      isDarkMode: resolveThemeIsDark(themeMode, getSystemPrefersDark()),
    });
  },
}));

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  mediaQuery.addEventListener("change", (event) => {
    if (useThemeStore.getState().themeMode === "auto") {
      useThemeStore.setState({ isDarkMode: event.matches });
    }
  });
}

export default useThemeStore;

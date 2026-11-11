import dayjs from "dayjs";

export const UMI_LOCALE_STORAGE_KEY = "umi_locale";

export const SUPPORTED_PANEL_LOCALES = ["zh-CN", "zh-TW", "en-US"] as const;

export type SupportedPanelLocale = (typeof SUPPORTED_PANEL_LOCALES)[number];

const LOCALE_LABELS: Record<SupportedPanelLocale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "en-US": "English",
};

const DAYJS_LOCALE_MAP: Record<SupportedPanelLocale, string> = {
  "zh-CN": "zh-cn",
  "zh-TW": "zh-tw",
  "en-US": "en",
};

export function normalizePanelLocale(locale?: string): SupportedPanelLocale {
  return SUPPORTED_PANEL_LOCALES.includes(locale as SupportedPanelLocale) ? (locale as SupportedPanelLocale) : "zh-CN";
}

export function readBootPanelLocale(storedLocale?: string | null): SupportedPanelLocale {
  return normalizePanelLocale(storedLocale ?? undefined);
}

export function readWindowBootPanelLocale(): SupportedPanelLocale {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return "zh-CN";
  }

  return readBootPanelLocale(window.localStorage.getItem(UMI_LOCALE_STORAGE_KEY));
}

export function getLocaleLabel(locale: SupportedPanelLocale): string {
  return LOCALE_LABELS[locale];
}

export function getDayjsLocale(locale?: string): string {
  return DAYJS_LOCALE_MAP[normalizePanelLocale(locale)];
}

export function applyDayjsLocale(locale?: string): string {
  const nextDayjsLocale = getDayjsLocale(locale);
  dayjs.locale(nextDayjsLocale);
  return nextDayjsLocale;
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { vi } from "./locales/vi";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "vi";

// Vietnamese (default and fallback) is part of the main script. English is a
// separate chunk, downloaded the first time English is shown (loadLocale).
void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

let englishLoad: Promise<void> | null = null;

/** Makes the strings of `locale` available; resolves at once when they already are. */
export function loadLocale(locale: AppLocale): Promise<void> {
  if (locale === DEFAULT_LOCALE || i18n.hasResourceBundle(locale, "translation")) return Promise.resolve();
  englishLoad ??= import("./locales/en")
    .then(({ en }) => { i18n.addResourceBundle("en", "translation", en, true, true); })
    .catch((error: unknown) => {
      // Network failure: the UI stays in Vietnamese; the next switch tries again.
      englishLoad = null;
      throw error;
    });
  return englishLoad;
}

/**
 * Loads the locale's strings, then switches i18next to it. If the English
 * chunk cannot be downloaded, the language still switches (dates and numbers
 * follow it) and the texts fall back to Vietnamese until a later switch.
 */
export async function changeAppLocale(locale: AppLocale): Promise<void> {
  try {
    await loadLocale(locale);
  } catch (error) {
    console.error("[i18n] could not load the strings for", locale, error);
  }
  await i18n.changeLanguage(locale);
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function toIntlLocale(locale: AppLocale): "vi-VN" | "en-US" {
  return locale === "en" ? "en-US" : "vi-VN";
}

export default i18n;

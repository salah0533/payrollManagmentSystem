import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "@/locales/ar";
import en from "@/locales/en";
import fr from "@/locales/fr";

export const DEFAULT_LANGUAGE = "en";
export const APP_LANGUAGE_STORAGE_KEY = "payroll-management-language";
export const APP_LANGUAGES = ["en", "fr", "ar"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const APP_LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

export const APP_LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-DZ",
};

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

export function normalizeAppLanguage(value?: string | null): AppLanguage {
  const normalized = String(value || "").trim().toLowerCase();
  return (APP_LANGUAGES as readonly string[]).includes(normalized)
    ? (normalized as AppLanguage)
    : DEFAULT_LANGUAGE;
}

export function isRtlLanguage(language?: string | null) {
  return normalizeAppLanguage(language) === "ar";
}

export function getLocaleTag(language?: string | null) {
  return APP_LANGUAGE_LOCALES[normalizeAppLanguage(language)];
}

function getStoredLanguage(): AppLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeAppLanguage(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
}

function getBrowserLanguage(): AppLanguage {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  return normalizeAppLanguage(navigator.language);
}

function setStoredLanguage(language: AppLanguage) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
  }
}

export function applyLanguageMetadata(language?: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  const normalized = normalizeAppLanguage(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = isRtlLanguage(normalized) ? "rtl" : "ltr";
}

const initialLanguage = getStoredLanguage() || getBrowserLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

applyLanguageMetadata(initialLanguage);

export async function changeAppLanguage(language?: string | null) {
  const normalized = normalizeAppLanguage(language);
  await i18n.changeLanguage(normalized);
  setStoredLanguage(normalized);
  applyLanguageMetadata(normalized);
  return normalized;
}

export function getCurrentLanguage(): AppLanguage {
  return normalizeAppLanguage(i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE);
}

export default i18n;

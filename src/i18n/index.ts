import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { localeCodes, normalizeLocale, type LocaleCode } from "@/lib/i18n/locale";
import {
  LOCALE_CHANGE_EVENT,
  LOCALE_STORAGE_KEY,
  detectSystemLocale,
  getLocalePreference,
  persistLocalePreference,
  resolveLocalePreference,
  type LocalePreference,
} from "@/lib/i18n/preference";
import enUS from "./locales/en-US.json";
import zhCN from "./locales/zh-CN.json";

export type { LocaleCode, LocalePreference };
export {
  LOCALE_CHANGE_EVENT,
  LOCALE_STORAGE_KEY,
  detectSystemLocale,
  getLocalePreference,
  localeCodes,
  normalizeLocale,
  resolveLocalePreference,
};

const resources = {
  "en-US": { translation: enUS },
  "zh-CN": { translation: zhCN },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en-US",
  fallbackLng: "en-US",
  supportedLngs: [...localeCodes],
  interpolation: { escapeValue: false },
});

export function syncDocumentLanguage(language: string) {
  const locale = normalizeLocale(language) ?? "en-US";
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export default i18n;

export const supportedLocales = [
  { code: "en-US" as const, label: "English", nativeLabel: "English" },
  { code: "zh-CN" as const, label: "Chinese", nativeLabel: "中文" },
];

export const changeLocale = async (preference: LocalePreference) => {
  persistLocalePreference(preference);
  await i18n.changeLanguage(resolveLocalePreference(preference));
  syncDocumentLanguage(i18n.language);
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: preference }));
};

export function getResolvedLocale(): LocaleCode {
  return normalizeLocale(i18n.resolvedLanguage || i18n.language) ?? "en-US";
}

export async function applyStoredLocalePreference(): Promise<void> {
  const preference = getLocalePreference();
  await i18n.changeLanguage(resolveLocalePreference(preference));
  syncDocumentLanguage(i18n.language);
}

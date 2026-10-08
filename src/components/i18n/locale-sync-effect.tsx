"use client";

import { useEffect } from "react";
import i18n, {
  getLocalePreference,
  normalizeLocale,
  resolveLocalePreference,
  syncDocumentLanguage,
} from "@/i18n";

async function syncSystemLocale() {
  if (getLocalePreference() !== "system") return;

  const systemLocale = resolveLocalePreference("system");
  const active = normalizeLocale(i18n.resolvedLanguage || i18n.language);
  if (active === systemLocale) return;

  await i18n.changeLanguage(systemLocale);
  syncDocumentLanguage(i18n.language);
}

export function LocaleSyncEffect() {
  useEffect(() => {
    void syncSystemLocale();
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => void syncSystemLocale();
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  return null;
}

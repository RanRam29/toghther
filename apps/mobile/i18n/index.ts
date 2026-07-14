import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";

import type { AppLanguage } from "@/lib/types";
import { applyWebDocumentDirection } from "@/lib/platform";
import he from "./locales/he.json";
import en from "./locales/en.json";

const resources = {
  he: { translation: he },
  en: { translation: en },
};

function resolveLanguage(preferred?: AppLanguage): AppLanguage {
  if (preferred) return preferred;
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === "he" ? "he" : "en";
}

export async function applyRTL(language: AppLanguage): Promise<boolean> {
  const shouldBeRTL = language === "he";
  applyWebDocumentDirection(language);

  if (I18nManager.isRTL === shouldBeRTL) return false;

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true;
}

export async function initI18n(preferred?: AppLanguage): Promise<AppLanguage> {
  const language = resolveLanguage(preferred);
  await applyRTL(language);

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: "he",
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
    });
  } else {
    await i18n.changeLanguage(language);
  }

  return language;
}

export async function changeAppLanguage(language: AppLanguage): Promise<boolean> {
  const needsReload = await applyRTL(language);
  await i18n.changeLanguage(language);
  return needsReload;
}

export default i18n;

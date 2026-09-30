import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ar } from "./ar";

export type Lang = "en" | "ar";
export const LANG_STORAGE_KEY = "iu-hr-lang";

const stored = (typeof localStorage !== "undefined" && localStorage.getItem(LANG_STORAGE_KEY)) as Lang | null;
const initialLang: Lang = stored === "ar" || stored === "en" ? stored : "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function applyDir(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
}

applyDir(initialLang);

export default i18n;

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { applyDir, LANG_STORAGE_KEY, type Lang } from "@/i18n";

/**
 * Thin wrapper over react-i18next that also flips document direction and
 * persists the choice. Every component reads `lang` / `dir` from here.
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const lang = (i18n.language === "ar" ? "ar" : "en") as Lang;
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  const setLang = useCallback(
    (next: Lang) => {
      void i18n.changeLanguage(next);
      applyDir(next);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    },
    [i18n],
  );

  const toggle = useCallback(() => setLang(lang === "ar" ? "en" : "ar"), [lang, setLang]);

  /** Resolve a bilingual `{ en, ar }` value for the active language. */
  const t2 = useCallback((bi: { en: string; ar: string }) => (lang === "ar" ? bi.ar : bi.en), [lang]);

  return { lang, dir, setLang, toggle, t2 };
}

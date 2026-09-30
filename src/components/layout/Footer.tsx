import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {t("common.university")} — {t("common.appName")}
        </p>
        <p className="max-w-md">{t("landing.footerNote")}</p>
      </div>
    </footer>
  );
}

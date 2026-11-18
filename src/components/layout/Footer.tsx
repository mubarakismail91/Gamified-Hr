import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {t("common.university")} — {t("common.appName")}
        </p>
        <p>
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            {t("privacy.title")}
          </Link>
        </p>
      </div>
    </footer>
  );
}

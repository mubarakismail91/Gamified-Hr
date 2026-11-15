import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/** Report Section 4.4.6: points, ranks and badges are never used for employment decisions. */
export function EmploymentNotice() {
  const { t } = useTranslation();
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {t("privacy.employmentNotice")}{" "}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
          {t("privacy.learnMore")}
        </Link>
      </span>
    </p>
  );
}

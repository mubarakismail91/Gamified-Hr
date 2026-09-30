import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/useLocale";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { lang, toggle } = useLocale();

  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      onClick={toggle}
      aria-label={t("a11y.language")}
      className="gap-2"
    >
      <Languages className="h-4 w-4" />
      {!compact && <span className="font-semibold">{lang === "ar" ? "English" : "العربية"}</span>}
    </Button>
  );
}

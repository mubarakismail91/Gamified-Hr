import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * IU emblem + bilingual wordmark. The SVG in /public/iu-mark.svg is a neutral
 * placeholder — swap it for the official university crest before launch.
 */
export function BrandMark({
  className,
  showWordmark = true,
  wordmark = "always",
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  /** "smUp" hides the text on the narrowest screens to keep the navbar tidy. */
  wordmark?: "always" | "smUp";
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const mark = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img src="/iu-mark.svg" alt="" aria-hidden className={cn(mark, "shrink-0 rounded-lg")} />
      {showWordmark && (
        <span
          className={cn(
            "flex-col leading-tight",
            wordmark === "smUp" ? "hidden sm:flex" : "flex",
          )}
        >
          <span className="text-sm font-bold text-foreground">{t("common.appName")}</span>
          <span className="text-[11px] text-muted-foreground">{t("common.university")}</span>
        </span>
      )}
    </span>
  );
}

import { useLocale } from "@/hooks/useLocale";
import { formatGregorian, formatHijri, timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Shows a Gregorian date with the Hijri equivalent underneath (or inline).
 * `relative` swaps the primary line for "3 hours ago".
 */
export function DateStamp({
  date,
  relative = false,
  inline = false,
  className,
}: {
  date: Date;
  relative?: boolean;
  inline?: boolean;
  className?: string;
}) {
  const { lang } = useLocale();
  const greg = formatGregorian(date, lang);
  const hijri = formatHijri(date, lang);

  if (inline) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {relative ? timeAgo(date, lang) : greg} <span aria-hidden>·</span>{" "}
        <span className="whitespace-nowrap">{hijri}</span>
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col", className)}>
      <span className="text-sm text-foreground">{relative ? timeAgo(date, lang) : greg}</span>
      <span className="text-xs text-muted-foreground">{hijri}</span>
    </span>
  );
}

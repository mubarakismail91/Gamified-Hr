/**
 * Date helpers. The prototype shows Gregorian + Hijri side by side wherever a
 * date is meaningful (activity feed, quest deadlines, audit trail).
 * Hijri conversion uses the built-in `islamic-umalqura` calendar via Intl.
 */

export function formatGregorian(date: Date, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatHijri(date: Date, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-US-u-ca-islamic-umalqura",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(date);
}

/** "3 hours ago" / "منذ ٣ ساعات" */
export function timeAgo(date: Date, locale: "en" | "ar") {
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(days, "day");
}

/** Minus N days/hours from now — used to seed realistic-looking mock timestamps. */
export function ago({ days = 0, hours = 0, minutes = 0 }: { days?: number; hours?: number; minutes?: number }) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

/** Plus N days from now. */
export function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

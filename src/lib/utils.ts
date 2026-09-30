import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with locale-aware grouping, e.g. 12,480 / ١٢٬٤٨٠ */
export function formatNumber(value: number, locale: "en" | "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
}

/** Clamp helper for progress bars. */
export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/** Deterministic pick so mock data looks stable between renders. */
export function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

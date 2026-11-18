import { describe, expect, it } from "vitest";
import { clamp, formatBytes, formatNumber } from "./utils";
import { formatHijri } from "./dates";

describe("formatting", () => {
  it("clamps progress bars to 0–100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(42)).toBe(42);
    expect(clamp(140)).toBe(100);
  });

  it("formats file sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("uses Arabic-Indic digits in Arabic", () => {
    expect(formatNumber(12480, "en")).toBe("12,480");
    expect(formatNumber(12480, "ar")).toMatch(/[٠-٩]/);
  });

  it("shows Hijri (Umm al-Qura) dates", () => {
    // 1 Ramadan 1447 AH = 18 February 2026 in the Umm al-Qura calendar.
    expect(formatHijri(new Date(Date.UTC(2026, 1, 18, 12)), "en")).toMatch(/Ramadan 1, 1447/);
  });
});

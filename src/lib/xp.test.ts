import { describe, expect, it } from "vitest";
import { levelFromXp, RANKS } from "./xp";

describe("rank tiers", () => {
  it("start at level 1 with 0 XP and rise strictly", () => {
    expect(RANKS[0]).toMatchObject({ level: 1, threshold: 0 });
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].level).toBe(RANKS[i - 1].level + 1);
      expect(RANKS[i].threshold).toBeGreaterThan(RANKS[i - 1].threshold);
    }
  });

  it("every rank has an English and an Arabic name", () => {
    for (const r of RANKS) {
      expect(r.nameEn.trim()).not.toBe("");
      expect(r.nameAr.trim()).not.toBe("");
    }
  });
});

describe("levelFromXp", () => {
  it("a new employee is a Newcomer, 300 XP from Contributor", () => {
    const p = levelFromXp(0);
    expect(p.current.nameEn).toBe("Newcomer");
    expect(p.next?.nameEn).toBe("Contributor");
    expect(p.xpToNext).toBe(300);
    expect(p.pct).toBe(0);
  });

  it("reaching a threshold exactly promotes to that rank", () => {
    expect(levelFromXp(299).current.level).toBe(1);
    expect(levelFromXp(300).current.level).toBe(2);
    expect(levelFromXp(800).current.level).toBe(3);
  });

  it("reports progress within the current rank", () => {
    // Contributor (300) -> Practitioner (800): 550 XP is 250 of 500, 50%.
    const p = levelFromXp(550);
    expect(p.current.nameEn).toBe("Contributor");
    expect(p.intoLevel).toBe(250);
    expect(p.levelSpan).toBe(500);
    expect(p.pct).toBe(50);
    expect(p.xpToNext).toBe(250);
  });

  it("the top rank has no next rank and shows 100%", () => {
    const top = RANKS[RANKS.length - 1];
    const p = levelFromXp(top.threshold + 5000);
    expect(p.current).toBe(top);
    expect(p.next).toBeNull();
    expect(p.pct).toBe(100);
    expect(p.xpToNext).toBe(0);
  });

  it("works for every threshold in the table", () => {
    for (const r of RANKS) expect(levelFromXp(r.threshold).current.level).toBe(r.level);
  });
});

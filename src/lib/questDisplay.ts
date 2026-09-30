import type { Quest } from "@/data";

/** i18n key for each difficulty ("intensity") level — Light / Moderate / In-depth. */
export const DIFFICULTY_LABEL_KEY: Record<Quest["difficulty"], string> = {
  easy: "quests.difficultyEasy",
  medium: "quests.difficultyMedium",
  hard: "quests.difficultyHard",
};

/**
 * Badge colour per difficulty, mapped to existing design-system tokens only
 * (no new colours): Light → success (green), Moderate → gold (amber),
 * In-depth → destructive (red).
 */
export const DIFFICULTY_BADGE_VARIANT: Record<Quest["difficulty"], "success" | "gold" | "destructive"> = {
  easy: "success",
  medium: "gold",
  hard: "destructive",
};

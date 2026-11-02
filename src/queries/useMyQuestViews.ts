import { useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { useQuestsQuery } from "./useQuests";
import { useMyAssignmentsQuery } from "./useAssignments";
import type { Quest, UserQuest } from "@/data";

/** A quest paired with the signed-in employee's own progress on it. */
export interface QuestView {
  quest: Quest;
  progress: UserQuest;
}

/**
 * Client-side equivalent of the demo's visibleQuestsFor() — the backend's
 * GET /quests already returns only quests this Employee can see, so this
 * just zips each one with their own assignment row, defaulting to the
 * synthetic "available" placeholder when no row exists yet (same rule as
 * the demo: absence of an assignment = not started).
 */
export function useMyQuestViews() {
  const { user } = useSession();
  const questsQuery = useQuestsQuery();
  const assignmentsQuery = useMyAssignmentsQuery();

  const views = useMemo<QuestView[]>(() => {
    if (!questsQuery.data) return [];
    const byQuestId = new Map(assignmentsQuery.data?.map((a) => [a.questId, a]) ?? []);
    return questsQuery.data.map((quest) => ({
      quest,
      progress: byQuestId.get(quest.id) ?? {
        userId: user.id,
        questId: quest.id,
        state: "available" as const,
        stepsDone: 0,
      },
    }));
  }, [questsQuery.data, assignmentsQuery.data, user.id]);

  return { views, isLoading: questsQuery.isLoading || assignmentsQuery.isLoading };
}

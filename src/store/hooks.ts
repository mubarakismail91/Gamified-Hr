import { useMemo } from "react";
import { useDemoData } from "./DemoDataContext";
import { useSession } from "@/context/SessionContext";
import {
  activityFor,
  departmentTeam,
  managedDepartment,
  notificationsFor,
  pendingApprovals,
  unreadCountFor,
  userBadges,
  visibleQuestsFor,
} from "./selectors";

/** Notifications scoped to the currently active identity. */
export function useMyNotifications() {
  const { state, markNotificationRead, markAllNotificationsRead } = useDemoData();
  const { user } = useSession();
  const items = useMemo(() => notificationsFor(state, user.id), [state, user.id]);
  const unreadCount = unreadCountFor(state, user.id);
  return {
    items,
    unreadCount,
    markRead: markNotificationRead,
    markAllRead: () => markAllNotificationsRead(user.id),
  };
}

/** Activity feed for the currently active identity. */
export function useMyActivity() {
  const { state } = useDemoData();
  const { user } = useSession();
  return useMemo(() => activityFor(state, user.id), [state, user.id]);
}

/** Badge catalogue with earned/progress resolved for the currently active identity. */
export function useMyBadges() {
  const { state } = useDemoData();
  const { user } = useSession();
  return useMemo(() => userBadges(state, user), [state, user]);
}

/** Quests visible to the currently active identity, merged with their own progress. */
export function useMyQuests() {
  const { state } = useDemoData();
  const { user } = useSession();
  return useMemo(() => visibleQuestsFor(state, user), [state, user]);
}

/** The department a Manager (or Admin, when given an id) runs, plus their team. */
export function useManagedDepartment(managerId: string) {
  const { state } = useDemoData();
  return useMemo(() => {
    const department = managedDepartment(state, managerId);
    const team = department ? departmentTeam(state, department.id, { excludeManager: true }) : [];
    return { department, team };
  }, [state, managerId]);
}

/** Pending quest approvals for a department (or every department when null). */
export function usePendingApprovals(departmentId: string | null) {
  const { state } = useDemoData();
  return useMemo(() => pendingApprovals(state, departmentId), [state, departmentId]);
}

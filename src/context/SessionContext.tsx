import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useDemoData } from "@/store/DemoDataContext";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_USER_ID } from "@/store/seed";
import type { Role, StaffMember } from "@/data";

interface SessionValue {
  /** True once a real backend session (login or a restored refresh-cookie session) exists. */
  authed: boolean;
  /** True only while the initial silent-refresh check is in flight — see AuthContext. */
  authLoading: boolean;
  user: StaffMember;
  role: Role;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { state } = useDemoData();
  const { authUser, authLoading, logout } = useAuth();

  const signOut = useCallback(() => {
    void logout();
  }, [logout]);

  // Every authenticated route is gated behind RequireAuth (see router.tsx),
  // so authUser is always set by the time a real page reads `user` — this
  // fallback only matters pre-login (e.g. Landing, which never reads it).
  const user = authUser ?? state.users.find((u) => u.id === DEFAULT_USER_ID)!;

  const value = useMemo<SessionValue>(
    () => ({ authed: !!authUser, authLoading, user, role: user.role, signOut }),
    [authUser, authLoading, user, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

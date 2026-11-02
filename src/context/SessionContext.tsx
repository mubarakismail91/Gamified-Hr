import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
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

/** Stand-in for the pre-login screens, which never read it — every authenticated route is gated by RequireAuth. */
const SIGNED_OUT_USER: StaffMember = {
  id: "",
  name: { en: "", ar: "" },
  initials: "",
  title: { en: "", ar: "" },
  departmentId: null,
  department: { en: "", ar: "" },
  college: { en: "", ar: "" },
  role: "employee",
  gender: "male",
  staffId: "",
  email: "",
  office: { en: "", ar: "" },
  joined: new Date(0),
  totalXp: 0,
  pointsThisWeek: 0,
  pointsThisMonth: 0,
  xpGainedThisMonth: 0,
  streakDays: 0,
  badgeIds: [],
  avatarTone: "",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const { authUser, authLoading, logout } = useAuth();

  const signOut = useCallback(() => {
    void logout();
  }, [logout]);

  const user = authUser ?? SIGNED_OUT_USER;

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

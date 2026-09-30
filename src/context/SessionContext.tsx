import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useDemoData } from "@/store/DemoDataContext";
import { DEFAULT_USER_ID } from "@/store/seed";
import type { Role, StaffMember } from "@/data";

const AUTH_KEY = "iu-hr-authed";
const USER_KEY = "iu-hr-current-user";

interface SessionValue {
  authed: boolean;
  user: StaffMember;
  role: Role;
  signIn: () => void;
  signOut: () => void;
  /** Switches the active identity — the demo's stand-in for real per-user login. */
  switchUser: (userId: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { state } = useDemoData();

  const [authed, setAuthed] = useState<boolean>(
    () => (typeof sessionStorage !== "undefined" && sessionStorage.getItem(AUTH_KEY) === "1") || false,
  );
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(USER_KEY) : null;
    return stored ?? DEFAULT_USER_ID;
  });

  const signIn = useCallback(() => {
    setAuthed(true);
    try {
      sessionStorage.setItem(AUTH_KEY, "1");
    } catch {
      /* storage unavailable — prototype still works in-memory */
    }
  }, []);

  const signOut = useCallback(() => {
    setAuthed(false);
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const switchUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    try {
      localStorage.setItem(USER_KEY, userId);
    } catch {
      /* ignore */
    }
  }, []);

  const user = state.users.find((u) => u.id === currentUserId) ?? state.users.find((u) => u.id === DEFAULT_USER_ID)!;

  const value = useMemo<SessionValue>(
    () => ({ authed, user, role: user.role, signIn, signOut, switchUser }),
    [authed, user, signIn, signOut, switchUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

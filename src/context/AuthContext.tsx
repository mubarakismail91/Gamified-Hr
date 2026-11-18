import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/authApi";
import { setOnAuthExpired } from "@/api/client";
import type { StaffMember } from "@/data";

interface AuthValue {
  /** The real, backend-authenticated user — null until login succeeds or the silent refresh on load finds a session. */
  authUser: StaffMember | null;
  /** True only during the initial silent-refresh attempt on app load — lets the UI avoid a login-page flash while that's in flight. */
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the signed-in user (e.g. after a live notification says their XP changed). Resolves false if the session is gone. */
  reloadUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<StaffMember | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  // Access tokens live only in memory (see api/client.ts), so a full page
  // reload always starts logged-out until this silent refresh — using the
  // httpOnly cookie the browser already holds — proves there's a session.
  useEffect(() => {
    authApi
      .refresh()
      .then(setAuthUser)
      .finally(() => setAuthLoading(false));
  }, []);

  // A refresh attempt failing *after* the initial load (e.g. the token
  // expired mid-session) means the session is gone — drop back to logged-out
  // so RequireAuth redirects to the login screen.
  useEffect(() => {
    setOnAuthExpired(() => {
      setAuthUser(null);
      queryClient.clear();
    });
    return () => setOnAuthExpired(null);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await authApi.login(email, password);
      // Wipe every cached query (notifications, users, leaderboard, …) before
      // switching identities — otherwise the previous user's cached data can
      // flash, or be served stale, until each query happens to refetch.
      queryClient.clear();
      setAuthUser(user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setAuthUser(null);
    queryClient.clear();
  }, [queryClient]);

  const reloadUser = useCallback(async () => {
    try {
      // Goes through the API client, so an expired access token is silently refreshed first.
      setAuthUser(await authApi.me());
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ authUser, authLoading, login, logout, reloadUser }),
    [authUser, authLoading, login, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

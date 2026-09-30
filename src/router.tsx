import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/context/SessionContext";
import { canManageTeam, canViewBadges, canViewSkillTree } from "@/lib/permissions";
import type { Role } from "@/data";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Leaderboard from "@/pages/Leaderboard";
import Quests from "@/pages/Quests";
import Badges from "@/pages/Badges";
import SkillTree from "@/pages/SkillTree";
import Kudos from "@/pages/Kudos";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import AdminPanel from "@/pages/AdminPanel";
import ManageTeam from "@/pages/ManageTeam";

/** Gate: unauthenticated users are bounced to the landing / SSO screen. */
function RequireAuth() {
  const { authed } = useSession();
  if (!authed) return <Navigate to="/" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/** Gate: manual URL navigation to a role-gated route redirects to the dashboard instead of rendering. */
function RequirePermission({ check, children }: { check: (role: Role) => boolean; children: ReactNode }) {
  const { role } = useSession();
  if (!check(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/leaderboard", element: <Leaderboard /> },
      { path: "/quests", element: <Quests /> },
      {
        path: "/badges",
        element: (
          <RequirePermission check={canViewBadges}>
            <Badges />
          </RequirePermission>
        ),
      },
      {
        path: "/skills",
        element: (
          <RequirePermission check={canViewSkillTree}>
            <SkillTree />
          </RequirePermission>
        ),
      },
      { path: "/kudos", element: <Kudos /> },
      { path: "/profile", element: <Profile /> },
      { path: "/notifications", element: <Notifications /> },
      {
        path: "/manage-team",
        element: (
          <RequirePermission check={canManageTeam}>
            <ManageTeam />
          </RequirePermission>
        ),
      },
      { path: "/admin", element: <AdminPanel /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

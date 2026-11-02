import {
  LayoutDashboard,
  Trophy,
  Swords,
  Medal,
  Network,
  HeartHandshake,
  UserRound,
  ShieldCheck,
  Users2,
  Bell,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/data";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  section: "main" | "community" | "manage";
  /** Roles allowed to see this item. Omitted = everyone. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, section: "main" },
  { to: "/quests", labelKey: "nav.quests", icon: Swords, section: "main", roles: ["employee"] },
  { to: "/badges", labelKey: "nav.badges", icon: Medal, section: "main", roles: ["employee"] },
  { to: "/skills", labelKey: "nav.skills", icon: Network, section: "main", roles: ["employee"] },
  { to: "/surveys", labelKey: "nav.surveys", icon: ClipboardList, section: "main", roles: ["employee"] },
  { to: "/leaderboard", labelKey: "nav.leaderboard", icon: Trophy, section: "community" },
  { to: "/kudos", labelKey: "nav.kudos", icon: HeartHandshake, section: "community" },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound, section: "community" },
  { to: "/notifications", labelKey: "nav.notifications", icon: Bell, section: "community" },
  {
    to: "/manage-team",
    labelKey: "nav.manageTeam",
    icon: Users2,
    section: "manage",
    roles: ["manager"],
  },
  {
    to: "/admin",
    labelKey: "nav.admin",
    icon: ShieldCheck,
    section: "manage",
    roles: ["admin"],
  },
];

export function visibleNav(role: Role) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}

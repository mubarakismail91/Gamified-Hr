import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { visibleNav, type NavItem } from "./nav";
import { useSession } from "@/context/SessionContext";
import { useMyNotifications } from "@/queries/useNotifications";
import { cn } from "@/lib/utils";

const SECTION_ORDER: NavItem["section"][] = ["main", "community", "manage"];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { role } = useSession();
  const { unreadCount } = useMyNotifications();
  const items = visibleNav(role);

  return (
    <nav className="flex flex-col gap-6">
      {SECTION_ORDER.map((section) => {
        const group = items.filter((i) => i.section === section);
        if (!group.length) return null;
        return (
          <div key={section} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`nav.sections.${section}`)}
            </p>
            {group.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{t(labelKey)}</span>
                {to === "/notifications" && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

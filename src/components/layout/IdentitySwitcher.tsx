import { useMemo } from "react";
import { Check, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import type { Role } from "@/data";

const ROLE_ORDER: Role[] = ["employee", "manager", "admin"];

/**
 * Prototype-only control. There's no real login yet, so this dropdown IS the
 * demo's "sign in as" mechanism — it also doubles as the Admin "impersonate /
 * switch views" capability from the spec, since Admin already sees every role.
 */
export function IdentitySwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { user, switchUser } = useSession();
  const { state } = useDemoData();

  const grouped = useMemo(() => {
    const byRole = new Map<Role, typeof state.users>();
    for (const r of ROLE_ORDER) byRole.set(r, []);
    for (const u of state.users) byRole.get(u.role)?.push(u);
    return ROLE_ORDER.map((r) => ({ role: r, users: byRole.get(r) ?? [] })).filter((g) => g.users.length > 0);
  }, [state.users]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "icon" : "sm"} className="gap-2" aria-label={t("roles.switchRole")}>
          <UserCog className="h-4 w-4" />
          {!compact && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("roles.switchRole")}:</span>
              <span className="max-w-[9rem] truncate font-semibold">{t2(user.name)}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Badge variant="gold">{t("common.prototypeBadge")}</Badge>
        </DropdownMenuLabel>
        <p className="px-2 pb-1.5 text-xs text-muted-foreground">{t("roles.switchRoleHint")}</p>
        {grouped.map((group) => (
          <div key={group.role}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t(`roles.${group.role}`)}
            </DropdownMenuLabel>
            {group.users.map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => switchUser(u.id)}>
                <span className="flex-1 truncate">{t2(u.name)}</span>
                {user.id === u.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

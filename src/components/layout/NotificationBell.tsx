import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DateStamp } from "@/components/common/DateStamp";
import { NotificationKindIcon } from "@/components/notifications/NotificationKindIcon";
import { useMyNotifications } from "@/queries/useNotifications";
import { useLocale } from "@/hooks/useLocale";

export function NotificationBell() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { items, unreadCount, markAllRead } = useMyNotifications();
  const recent = items.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("a11y.notifications")}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <Separator />
        <ul className="max-h-80 divide-y overflow-y-auto">
          {recent.map((n) => (
            <li key={n.id} className={`flex gap-3 px-3 py-3 ${n.read ? "" : "bg-primary/[0.04]"}`}>
              <NotificationKindIcon kind={n.kind} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug">{t2(n.title)}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{t2(n.body)}</p>
                <DateStamp date={n.at} relative inline />
              </div>
            </li>
          ))}
        </ul>
        <Separator />
        <Link
          to="/notifications"
          className="block px-3 py-2.5 text-center text-sm font-medium text-primary hover:bg-secondary"
        >
          {t("common.viewAll")}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

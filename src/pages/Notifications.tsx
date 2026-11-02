import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { DateStamp } from "@/components/common/DateStamp";
import { NotificationKindIcon } from "@/components/notifications/NotificationKindIcon";
import { useMyNotifications } from "@/queries/useNotifications";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, cn } from "@/lib/utils";
import type { NotificationKind } from "@/data";

type FilterKey = "all" | "xp" | "badges" | "social";

const MATCH: Record<FilterKey, NotificationKind[]> = {
  all: ["xp", "badge", "social", "quest", "system"],
  xp: ["xp"],
  badges: ["badge"],
  social: ["social"],
};

export default function Notifications() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { items, unreadCount, markAllRead, markRead } = useMyNotifications();
  const [filter, setFilter] = useState<FilterKey>("all");

  const list = useMemo(() => items.filter((n) => MATCH[filter].includes(n.kind)), [items, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notifications.title")}
        subtitle={
          unreadCount > 0
            ? t("notifications.unread", { n: formatNumber(unreadCount, lang) })
            : t("notifications.empty")
        }
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">{t("notifications.filterAll")}</TabsTrigger>
          <TabsTrigger value="xp">{t("notifications.filterXp")}</TabsTrigger>
          <TabsTrigger value="badges">{t("notifications.filterBadges")}</TabsTrigger>
          <TabsTrigger value="social">{t("notifications.filterSocial")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={CheckCheck} title={t("notifications.empty")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {list.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-4 text-start transition-colors hover:bg-secondary/50",
                      !n.read && "bg-primary/[0.04]",
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <NotificationKindIcon kind={n.kind} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{t2(n.title)}</p>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{t2(n.body)}</p>
                      <DateStamp date={n.at} relative inline />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

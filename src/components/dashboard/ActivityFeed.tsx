import { useTranslation } from "react-i18next";
import { Award, ChevronUp, HeartHandshake, Network, Swords, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateStamp } from "@/components/common/DateStamp";
import { EmptyState } from "@/components/common/EmptyState";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/data";

const KIND_ICON: Record<ActivityKind, typeof Award> = {
  xp: TrendingUp,
  badge: Award,
  quest: Swords,
  kudo: HeartHandshake,
  level: ChevronUp,
  skill: Network,
};

export function ActivityFeed({
  items,
  title,
  limit = 8,
}: {
  items: ActivityItem[];
  title?: string;
  limit?: number;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const list = items.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? t("dashboard.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <EmptyState icon={TrendingUp} title={t("dashboard.noActivity")} />
        ) : (
          <ul className="space-y-1">
            {list.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id} className="flex items-start gap-3 rounded-md px-1 py-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{t2(item.text)}</p>
                    <DateStamp date={item.at} relative inline />
                  </div>
                  {item.xp ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      +{formatNumber(item.xp, lang)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

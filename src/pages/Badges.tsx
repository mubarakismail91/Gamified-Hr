import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import { DateStamp } from "@/components/common/DateStamp";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, cn } from "@/lib/utils";
import { useMyBadges } from "@/store/hooks";
import type { BadgeView } from "@/store/selectors";

const TIER_RING = {
  bronze: "ring-amber-700/30 bg-amber-700/10 text-amber-800",
  silver: "ring-slate-400/40 bg-slate-400/10 text-slate-600",
  gold: "ring-gold/40 bg-gold/15 text-[hsl(var(--gold))]",
} as const;

type FilterKey = "all" | "earned" | "locked";

export default function Badges() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [active, setActive] = useState<BadgeView | null>(null);
  const badges = useMyBadges();

  const list = useMemo(
    () =>
      badges.all.filter((b) => (filter === "all" ? true : filter === "earned" ? b.earned : !b.earned)),
    [badges.all, filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("badges.title")}
        subtitle={t("badges.subtitle")}
        actions={
          <Badge variant="secondary" className="text-sm">
            {t("badges.countEarned", {
              n: formatNumber(badges.earnedCount, lang),
              total: formatNumber(badges.total, lang),
            })}
          </Badge>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList>
          <TabsTrigger value="all">{t("badges.filterAll")}</TabsTrigger>
          <TabsTrigger value="earned">{t("badges.filterEarned")}</TabsTrigger>
          <TabsTrigger value="locked">{t("badges.filterLocked")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((b) => (
          <button key={b.id} onClick={() => setActive(b)} className="text-start">
            <Card
              className={cn(
                "h-full transition-shadow hover:shadow-elevated",
                !b.earned && "bg-muted/40",
              )}
            >
              <CardContent className="flex h-full flex-col items-center gap-3 p-5 text-center">
                <span
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-full ring-2",
                    b.earned ? TIER_RING[b.tier] : "bg-secondary text-muted-foreground ring-border grayscale",
                  )}
                >
                  <BadgeIcon name={b.icon} className="h-7 w-7" />
                  {!b.earned && (
                    <span className="absolute -end-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </span>
                  )}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight">{t2(b.name)}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{t2(b.description)}</p>
                </div>
                {b.earned ? (
                  <Badge variant="success" className="mt-auto">
                    {t("badges.earned")}
                  </Badge>
                ) : (
                  <div className="mt-auto w-full space-y-1">
                    <Progress value={b.progressPct ?? 0} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      {t("badges.progressToward", { pct: formatNumber(b.progressPct ?? 0, lang) })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full ring-2",
                      active.earned
                        ? TIER_RING[active.tier]
                        : "bg-secondary text-muted-foreground ring-border grayscale",
                    )}
                  >
                    <BadgeIcon name={active.icon} className="h-6 w-6" />
                  </span>
                  <div>
                    <DialogTitle>{t2(active.name)}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{t2(active.group)}</p>
                  </div>
                </div>
                <DialogDescription>{t2(active.description)}</DialogDescription>
              </DialogHeader>

              <div className="rounded-md bg-secondary/60 p-3 text-sm">
                <p className="mb-1 font-medium">{t("badges.howTo")}</p>
                <p className="text-muted-foreground">{t2(active.howTo)}</p>
              </div>

              {active.earned ? (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <span className="font-medium">{t("badges.earned")}</span>
                  {active.earnedOn && <DateStamp date={active.earnedOn} inline className="text-success/80" />}
                </p>
              ) : (
                <div className="space-y-1">
                  <Progress value={active.progressPct ?? 0} />
                  <p className="text-xs text-muted-foreground">
                    {t("badges.progressToward", { pct: formatNumber(active.progressPct ?? 0, lang) })}
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import type { Badge as BadgeType } from "@/data";

const TIER_RING = {
  bronze: "ring-amber-700/30 bg-amber-700/10 text-amber-800",
  silver: "ring-slate-400/40 bg-slate-400/10 text-slate-600",
  gold: "ring-gold/40 bg-gold/15 text-[hsl(var(--gold))]",
} as const;

export function BadgeShowcase({ badges }: { badges: BadgeType[] }) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const show = badges.slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("dashboard.badgeShowcase")}</CardTitle>
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to="/badges">{t("common.viewAll")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
          {show.map((b) => (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full ring-2",
                      TIER_RING[b.tier],
                    )}
                  >
                    <BadgeIcon name={b.icon} className="h-5 w-5" />
                  </span>
                  <span className="line-clamp-1 text-center text-[11px] text-muted-foreground">
                    {t2(b.name)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t2(b.description)}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

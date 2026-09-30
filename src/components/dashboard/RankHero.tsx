import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LevelRing } from "@/components/common/LevelRing";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { levelFromXp } from "@/lib/xp";
import type { StaffMember } from "@/data";

export function RankHero({ user }: { user: StaffMember }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const prog = levelFromXp(user.totalXp);
  const rankName = lang === "ar" ? prog.current.nameAr : prog.current.nameEn;
  const nextName = prog.next ? (lang === "ar" ? prog.next.nameAr : prog.next.nameEn) : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <LevelRing pct={prog.pct} level={prog.current.level} size={104} />

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{t("dashboard.welcome", { name: user.name[lang] })}</h2>
            <Badge variant="gold" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {rankName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {formatNumber(user.totalXp, lang)}{" "}
                <span className="text-muted-foreground">{t("common.xp")}</span>
              </span>
              {nextName && (
                <span className="text-xs text-muted-foreground">
                  {t("dashboard.toNextLevel", {
                    xp: formatNumber(prog.xpToNext, lang),
                    rank: nextName,
                  })}
                </span>
              )}
            </div>
            <Progress value={prog.pct} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

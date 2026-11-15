import { useTranslation } from "react-i18next";
import { CheckCircle2, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DateStamp } from "@/components/common/DateStamp";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import type { Challenge } from "@/api/squadApi";

/** A squad challenge: target, bonus, dates, and (for a squad member) the squad's combined progress. */
export function ChallengeCard({
  challenge: c,
  canJoin,
  joinBlockedReason,
  onJoin,
  joining,
}: {
  challenge: Challenge;
  canJoin: boolean;
  joinBlockedReason?: string;
  onJoin?: () => void;
  joining?: boolean;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const unit = c.metric === "quests_completed" ? t("squads.unitQuests") : t("common.xp");
  const done = !!c.mine?.completedAt;
  const pct = c.mine ? Math.min(100, Math.round((c.mine.progress / c.target) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-muted-foreground" />
            {t2(c.title)}
          </CardTitle>
          {t2(c.description) && <p className="text-sm text-muted-foreground">{t2(c.description)}</p>}
        </div>
        <Badge variant={c.status === "active" ? "success" : "muted"}>{t(`squads.status.${c.status}`)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {t("squads.goal", { target: formatNumber(c.target, lang), unit })}
          {" · "}
          <span className="font-medium text-[hsl(var(--gold))]">
            {t("squads.bonus", { xp: formatNumber(c.bonusXp, lang) })}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <DateStamp date={new Date(c.startsAt)} inline /> <span>→</span> <DateStamp date={new Date(c.endsAt)} inline />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("squads.squadsTakingPart", {
            joined: formatNumber(c.squadsJoined, lang),
            completed: formatNumber(c.squadsCompleted, lang),
          })}
        </p>

        {c.mine?.joined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{t("squads.ourProgress")}</span>
              <span className="tabular-nums">
                {formatNumber(c.mine.progress, lang)} / {formatNumber(c.target, lang)} {unit}
              </span>
            </div>
            <Progress value={pct} indicatorClassName={done ? "bg-success" : undefined} />
            {done && (
              <p className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> {t("squads.completed")}
              </p>
            )}
          </div>
        )}

        {c.mine && !c.mine.joined && c.status !== "ended" && (
          <div className="space-y-1">
            <Button size="sm" onClick={onJoin} disabled={!canJoin || joining}>
              {t("squads.joinChallenge")}
            </Button>
            {!canJoin && joinBlockedReason && <p className="text-xs text-muted-foreground">{joinBlockedReason}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

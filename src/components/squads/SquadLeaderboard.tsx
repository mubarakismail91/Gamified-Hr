import { useTranslation } from "react-i18next";
import { UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { useSquadLeaderboardQuery } from "@/queries/useSquads";
import { useLocale } from "@/hooks/useLocale";
import { cn, formatNumber } from "@/lib/utils";
import { MIN_RANKED_MEMBERS } from "@/api/squadApi";

/** Team leaderboard (FR9): squads of 3+ ranked by average XP per member for the chosen period. */
export function SquadLeaderboard({ period }: { period: "week" | "month" }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const rows = useSquadLeaderboardQuery(period).data ?? [];

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          {t("squads.boardTitle")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("squads.boardNote", { n: formatNumber(MIN_RANKED_MEMBERS, lang) })}</p>
      </CardHeader>
      <CardContent className={rows.length === 0 ? undefined : "p-0"}>
        {rows.length === 0 ? (
          <EmptyState icon={UsersRound} title={t("squads.boardEmpty")} />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.squadId} className={cn("flex items-center gap-3 px-4 py-3", r.isMine && "bg-primary/[0.05]")}>
                <span
                  className={cn(
                    "w-8 shrink-0 text-center text-sm font-bold tabular-nums",
                    r.position <= 3 ? "text-[hsl(var(--gold))]" : "text-muted-foreground",
                  )}
                >
                  {formatNumber(r.position, lang)}
                </span>
                <div className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
                  {r.members.slice(0, 4).map((m) => (
                    <PersonAvatar key={m.id} person={m} size="sm" className="ring-2 ring-background" />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.name}
                    {r.isMine && (
                      <Badge variant="secondary" className="ms-2 align-middle">
                        {t("squads.yourSquad")}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("squads.boardMeta", {
                      members: formatNumber(r.memberCount, lang),
                      depts: formatNumber(r.departmentCount, lang),
                      total: formatNumber(r.totalXp, lang),
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatNumber(r.avgXp, lang)}
                  <span className="ms-1 text-xs font-normal text-muted-foreground">{t("squads.avgXp")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

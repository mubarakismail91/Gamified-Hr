import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Flame, Swords, TrendingUp, Trophy, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RankHero } from "@/components/dashboard/RankHero";
import { BadgeShowcase } from "@/components/dashboard/BadgeShowcase";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useSession } from "@/context/SessionContext";
import { useMyActivity } from "@/queries/useActivity";
import { useMyBadges } from "@/queries/useBadges";
import { useLeaderboardQuery } from "@/queries/useLeaderboard";
import { useMyAssignmentsQuery } from "@/queries/useAssignments";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { t } = useTranslation();
  const { lang, t2 } = useLocale();
  const { user } = useSession();
  const activity = useMyActivity();
  const badges = useMyBadges();
  const assignmentsQuery = useMyAssignmentsQuery();
  const leaderboardQuery = useLeaderboardQuery({ period: "week", metric: "points", scope: "dept" });

  const board = leaderboardQuery.data ?? [];
  const mine = board.find((r) => r.staffId === user.id);
  const dept = { position: mine?.position ?? board.length, total: board.length };
  const activeQuests = (assignmentsQuery.data ?? []).filter(
    (a) => a.state === "accepted" || a.state === "pending_approval",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.dashboard")} />

      <RankHero user={user} />

      <div className="stat-grid">
        <StatCard
          icon={TrendingUp}
          label={t("dashboard.pointsThisWeek")}
          value={`+${formatNumber(user.pointsThisWeek, lang)}`}
          hint={t("common.xp")}
        />
        <StatCard
          icon={Trophy}
          label={t("dashboard.deptRank", { dept: t2(user.department) })}
          value={`#${formatNumber(dept.position, lang)}`}
          hint={t("leaderboard.outOf", { total: formatNumber(dept.total, lang) })}
          tone="gold"
        />
        <StatCard
          icon={Swords}
          label={t("dashboard.questsActive")}
          value={formatNumber(activeQuests, lang)}
        />
        <StatCard
          icon={Flame}
          label={t("dashboard.streak")}
          value={`${formatNumber(user.streakDays, lang)} ${t("dashboard.days")}`}
          tone="muted"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BadgeShowcase badges={badges.earned} />
          <ActivityFeed items={activity} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/leaderboard">
                  <Trophy className="h-4 w-4" />
                  {t("dashboard.viewLeaderboard")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/quests">
                  <Swords className="h-4 w-4" />
                  {t("dashboard.browseQuests")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/kudos">
                  <HeartHandshake className="h-4 w-4" />
                  {t("dashboard.sendKudos")}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {t("common.thisWeek")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label={t("dashboard.pointsThisWeek")} value={`+${formatNumber(user.pointsThisWeek, lang)}`} />
              <Row label={t("common.thisMonth")} value={`+${formatNumber(user.pointsThisMonth, lang)}`} />
              <Row
                label={t("profile.badgesEarned")}
                value={`${formatNumber(badges.earnedCount, lang)} / ${formatNumber(badges.total, lang)}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ClipboardCheck, HeartHandshake, Swords, Users2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { ApprovalsQueue } from "@/components/admin/ApprovalsQueue";
import { useSession } from "@/context/SessionContext";
import { useDepartmentsQuery } from "@/queries/useDepartments";
import { useUsersQuery } from "@/queries/useUsers";
import { useQuestsQuery } from "@/queries/useQuests";
import { usePendingApprovalsQuery } from "@/queries/useAssignments";
import { useLeaderboardQuery } from "@/queries/useLeaderboard";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user } = useSession();

  const departmentsQuery = useDepartmentsQuery();
  const dept = departmentsQuery.data?.[0];

  const usersQuery = useUsersQuery(dept?.id);
  const questsQuery = useQuestsQuery();
  const approvalsQuery = usePendingApprovalsQuery(dept?.id ?? null);
  const leaderboardQuery = useLeaderboardQuery({ period: "week", metric: "points", scope: "dept" });

  if (!dept) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} />
        <EmptyState icon={Building2} title={t("manageTeam.noDept")} />
      </div>
    );
  }

  const team = (usersQuery.data ?? []).filter((u) => u.id !== dept.managerId);
  const approvals = approvalsQuery.data ?? [];
  const deptQuests = questsQuery.data?.length ?? 0;
  const board = leaderboardQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.welcome", { name: user.name[lang] })} subtitle={t("manageTeam.managerSubtitle", { dept: t2(dept.name) })} />

      <div className="stat-grid">
        <StatCard icon={Users2} label={t("manageTeam.teamSize")} value={formatNumber(team.length, lang)} />
        <StatCard
          icon={ClipboardCheck}
          label={t("manageTeam.pendingApprovals")}
          value={formatNumber(approvals.length, lang)}
          tone="gold"
        />
        <StatCard icon={Swords} label={t("manageTeam.deptQuests")} value={formatNumber(deptQuests, lang)} />
        <StatCard
          icon={Building2}
          label={t("common.department")}
          value={t2(dept.name)}
          tone="muted"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{t("manageTeam.approvalsTab")}</CardTitle>
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link to="/manage-team">{t("common.viewAll")}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ApprovalsQueue departmentId={dept.id} limit={4} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("manageTeam.teamRoster")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {team.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-5 py-2.5">
                    <PersonAvatar person={member} size="sm" />
                    <span className="flex-1 truncate text-sm">{t2(member.name)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(member.totalXp, lang)} {t("common.xp")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("manageTeam.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/manage-team">
                  <Users2 className="h-4 w-4" />
                  {t("nav.manageTeam")}
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
              <CardTitle>{t("manageTeam.deptLeaderboard")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {board.map((r) => (
                  <li key={r.staffId} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{r.position}</span>
                    <PersonAvatar person={r.staff} size="sm" />
                    <span className="flex-1 truncate text-sm">{t2(r.staff.name)}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(r.points, lang)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ClipboardCheck, Swords, Users2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { QuestManager } from "@/components/admin/QuestManager";
import { ApprovalsQueue } from "@/components/admin/ApprovalsQueue";
import { SubmissionHistory } from "@/components/admin/SubmissionHistory";
import { useSession } from "@/context/SessionContext";
import { useDepartmentsQuery } from "@/queries/useDepartments";
import { useUsersQuery } from "@/queries/useUsers";
import { useQuestsQuery } from "@/queries/useQuests";
import { usePendingApprovalsQuery } from "@/queries/useAssignments";
import { useLeaderboardQuery } from "@/queries/useLeaderboard";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { levelFromXp } from "@/lib/xp";

export default function ManageTeam() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { role } = useSession();

  const departmentsQuery = useDepartmentsQuery();
  // The backend already scopes a Manager's own /departments GET to just the
  // one they manage — no client-side "find mine" needed.
  const dept = departmentsQuery.data?.[0];

  const usersQuery = useUsersQuery(dept?.id);
  const questsQuery = useQuestsQuery();
  const approvalsQuery = usePendingApprovalsQuery(dept?.id ?? null);
  const leaderboardQuery = useLeaderboardQuery({ period: "week", metric: "points", scope: "dept" });

  if (role !== "manager") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("nav.manageTeam")} />
        <EmptyState icon={Users2} title={t("manageTeam.employeeNotice")} hint={t("roles.switchRoleHint")} />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/dashboard">{t("nav.dashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("nav.manageTeam")} />
        <EmptyState icon={Building2} title={t("manageTeam.noDept")} />
      </div>
    );
  }

  const team = (usersQuery.data ?? []).filter((u) => u.id !== dept.managerId);
  const approvals = approvalsQuery.data ?? [];
  const deptQuestCount = questsQuery.data?.length ?? 0;
  const board = leaderboardQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.manageTeam")} subtitle={t("manageTeam.subtitle")} />

      <div className="stat-grid">
        <StatCard icon={Users2} label={t("manageTeam.teamSize")} value={formatNumber(team.length, lang)} />
        <StatCard
          icon={ClipboardCheck}
          label={t("manageTeam.pendingApprovals")}
          value={formatNumber(approvals.length, lang)}
          tone="gold"
        />
        <StatCard icon={Swords} label={t("manageTeam.deptQuests")} value={formatNumber(deptQuestCount, lang)} />
        <StatCard
          icon={Building2}
          label={t("common.department")}
          value={t2(dept.name)}
          tone="muted"
        />
      </div>

      <Tabs defaultValue="team">
        <TabsList className="flex-wrap">
          <TabsTrigger value="team">{t("manageTeam.teamRoster")}</TabsTrigger>
          <TabsTrigger value="approvals">{t("manageTeam.approvalsTab")}</TabsTrigger>
          <TabsTrigger value="quests">{t("admin.tabs.quests")}</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          {team.length === 0 ? (
            <EmptyState icon={Users2} title={t("manageTeam.noTeam")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.usersTableName")}</TableHead>
                    <TableHead>{t("common.level")}</TableHead>
                    <TableHead>{t("profile.lifetimeXp")}</TableHead>
                    <TableHead>{t("dashboard.streak")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((member) => {
                    const prog = levelFromXp(member.totalXp);
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <PersonAvatar person={member} size="sm" />
                            <span className="truncate text-sm font-medium">{t2(member.name)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="gold">{prog.current.level}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatNumber(member.totalXp, lang)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {formatNumber(member.streakDays, lang)} {t("dashboard.days")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <p className="border-b px-4 py-3 text-sm font-semibold">{t("manageTeam.deptLeaderboard")}</p>
              <ul className="divide-y">
                {board.map((r) => (
                  <li key={r.staffId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{r.position}</span>
                    <PersonAvatar person={r.staff} size="sm" />
                    <span className="flex-1 truncate text-sm">{t2(r.staff.name)}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(r.points, lang)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <ApprovalsQueue departmentId={dept.id} />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("approvals.historyTitle")}</h2>
            <SubmissionHistory departmentId={dept.id} />
          </div>
        </TabsContent>

        <TabsContent value="quests">
          <QuestManager fixedDepartmentId={dept.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

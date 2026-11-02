import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ClipboardCheck, ScrollText, ShieldCheck, Swords, Users2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateStamp } from "@/components/common/DateStamp";
import { ParticipationChart } from "@/components/admin/Charts";
import { useSession } from "@/context/SessionContext";
import { useUsersQuery } from "@/queries/useUsers";
import { useDepartmentsQuery } from "@/queries/useDepartments";
import { useQuestsQuery } from "@/queries/useQuests";
import { usePendingApprovalsQuery } from "@/queries/useAssignments";
import { useAuditQuery } from "@/queries/useAudit";
import { useAnalyticsOverviewQuery } from "@/queries/useAnalytics";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user } = useSession();

  const usersQuery = useUsersQuery();
  const departmentsQuery = useDepartmentsQuery();
  const questsQuery = useQuestsQuery();
  const approvalsQuery = usePendingApprovalsQuery(null);
  const auditQuery = useAuditQuery(6);
  const overviewQuery = useAnalyticsOverviewQuery();

  const publishedQuests = (questsQuery.data ?? []).filter((q) => q.status === "published").length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.welcome", { name: user.name[lang] })} subtitle={t("admin.subtitle")} />

      <div className="stat-grid">
        <StatCard icon={Users2} label={t("admin.kpiTotalUsers")} value={formatNumber(usersQuery.data?.length ?? 0, lang)} />
        <StatCard
          icon={Building2}
          label={t("admin.kpiTotalDepartments")}
          value={formatNumber(departmentsQuery.data?.length ?? 0, lang)}
          tone="muted"
        />
        <StatCard icon={Swords} label={t("admin.kpiPublishedQuests")} value={formatNumber(publishedQuests, lang)} />
        <StatCard
          icon={ClipboardCheck}
          label={t("manageTeam.pendingApprovals")}
          value={formatNumber(approvalsQuery.data?.length ?? 0, lang)}
          tone="gold"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("admin.engagementOverTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipationChart data={overviewQuery.data?.participationTrend ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
                {t("nav.admin")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            {t("admin.tabs.audit")}
          </CardTitle>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to="/admin">{t("common.viewAll")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(auditQuery.data ?? []).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t2(a.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t2(a.actor)} · {t2(a.target)}
                  </p>
                </div>
                <DateStamp date={a.at} relative inline className="shrink-0" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

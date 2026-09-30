import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  Lock,
  RotateCcw,
  ScrollText,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateStamp } from "@/components/common/DateStamp";
import { EmptyState } from "@/components/common/EmptyState";
import {
  BadgeDistributionChart,
  DemographicsBar,
  ParticipationChart,
  SdtScoresChart,
  XpByDeptChart,
} from "@/components/admin/Charts";
import { QuestManager } from "@/components/admin/QuestManager";
import { UserManager } from "@/components/admin/UserManager";
import { DepartmentManager } from "@/components/admin/DepartmentManager";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { ADMIN_KPIS, DEMOGRAPHICS, SURVEYS } from "@/data";

export default function AdminPanel() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { role, user } = useSession();
  const { state, resetToSeed } = useDemoData();
  const [resetOpen, setResetOpen] = useState(false);

  if (role !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("admin.title")} />
        <EmptyState icon={Lock} title={t("admin.employeeNotice")} hint={t("roles.switchRoleHint")} />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/dashboard">{t("nav.dashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const confirmReset = () => {
    resetToSeed();
    toast.success(t("admin.resetDataToast"));
    setResetOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle")}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            {t("admin.resetData")}
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard
          icon={Users}
          label={t("admin.kpiActive")}
          value={formatNumber(ADMIN_KPIS.activeParticipants, lang)}
          hint={`/ ${formatNumber(ADMIN_KPIS.totalEligible, lang)}`}
        />
        <StatCard
          icon={Activity}
          label={t("admin.kpiParticipation")}
          value={`${formatNumber(ADMIN_KPIS.participationRate, lang)}%`}
          tone="gold"
        />
        <StatCard
          icon={ClipboardList}
          label={t("admin.kpiKudos")}
          value={formatNumber(ADMIN_KPIS.kudos30d, lang)}
        />
        <StatCard
          icon={BarChart3}
          label={t("admin.kpiQuests")}
          value={formatNumber(ADMIN_KPIS.quests30d, lang)}
          tone="muted"
        />
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics">{t("admin.tabs.analytics")}</TabsTrigger>
          <TabsTrigger value="demographics">{t("admin.tabs.demographics")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.tabs.users")}</TabsTrigger>
          <TabsTrigger value="departments">{t("admin.tabs.departments")}</TabsTrigger>
          <TabsTrigger value="quests">{t("admin.tabs.quests")}</TabsTrigger>
          <TabsTrigger value="surveys">{t("admin.tabs.surveys")}</TabsTrigger>
          <TabsTrigger value="audit">{t("admin.tabs.audit")}</TabsTrigger>
        </TabsList>

        {/* Analytics */}
        <TabsContent value="analytics" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.engagementOverTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipationChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.xpByDept")}</CardTitle>
            </CardHeader>
            <CardContent>
              <XpByDeptChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.badgeDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDistributionChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.tabs.surveys")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SdtScoresChart />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographics */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <FilterSelect label={t("admin.filterCollege")} />
            <FilterSelect label={t("admin.filterRole")} />
            <FilterSelect label={t("admin.filterGender")} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.filterRole")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DemographicsBar data={DEMOGRAPHICS.byRole} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.filterGender")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DemographicsBar data={DEMOGRAPHICS.byGender} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("admin.filterCollege")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DemographicsBar data={DEMOGRAPHICS.byCollege} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User management */}
        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        {/* Department management */}
        <TabsContent value="departments">
          <DepartmentManager />
        </TabsContent>

        {/* Quest management (university-wide) */}
        <TabsContent value="quests">
          <QuestManager createdBy={user.id} />
        </TabsContent>

        {/* Surveys */}
        <TabsContent value="surveys" className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">{t("admin.surveyTitle")}</p>
                <p>{t("admin.surveyDesc")}</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            {SURVEYS.map((s) => {
              const pct = s.target ? Math.round((s.responses / s.target) * 100) : 0;
              return (
                <Card key={s.id}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{t2(s.title)}</CardTitle>
                      <Badge
                        variant={
                          s.status === "open" ? "success" : s.status === "scheduled" ? "gold" : "muted"
                        }
                      >
                        {t(
                          s.status === "open"
                            ? "admin.surveyStatusOpen"
                            : s.status === "scheduled"
                              ? "admin.surveyStatusScheduled"
                              : "admin.surveyStatusClosed",
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={pct} />
                    <p className="text-xs text-muted-foreground">
                      {t("admin.surveyResponses", { n: formatNumber(s.responses, lang) })} ·{" "}
                      {formatNumber(pct, lang)}%
                    </p>
                    <DateStamp date={s.opens} inline />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Audit trail */}
        <TabsContent value="audit" className="space-y-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ScrollText className="h-4 w-4" />
            {t("admin.auditNote")}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.auditWhen")}</TableHead>
                  <TableHead>{t("admin.auditActor")}</TableHead>
                  <TableHead>{t("admin.auditAction")}</TableHead>
                  <TableHead>{t("admin.auditTarget")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      <DateStamp date={a.at} relative inline />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{t2(a.actor)}</TableCell>
                    <TableCell>{t2(a.action)}</TableCell>
                    <TableCell className="text-muted-foreground">{t2(a.target)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t("admin.resetData")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("admin.resetDataConfirm")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              {t("admin.resetData")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  const { t } = useTranslation();
  const [v, setV] = useState("all");
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={v} onValueChange={setV}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("admin.filterAll")}</SelectItem>
        </SelectContent>
      </Select>
    </label>
  );
}

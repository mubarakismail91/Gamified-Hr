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
  Plus,
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
import { useAuditQuery } from "@/queries/useAudit";
import { useAnalyticsOverviewQuery, useDemographicsQuery } from "@/queries/useAnalytics";
import {
  useQuestionBankQuery,
  useSdtScoresQuery,
  useSurveyRoundsQuery,
  useCreateSurveyRoundMutation,
} from "@/queries/useSurveys";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AdminPanel() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { role } = useSession();
  const auditQuery = useAuditQuery();
  const overviewQuery = useAnalyticsOverviewQuery();
  const demographicsQuery = useDemographicsQuery();
  const surveyRoundsQuery = useSurveyRoundsQuery();
  const sdtScoresQuery = useSdtScoresQuery();
  const createSurveyRound = useCreateSurveyRoundMutation();
  const questionBankQuery = useQuestionBankQuery();
  const [pickedKeys, setPickedKeys] = useState<string[]>([]);
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [roundTitleEn, setRoundTitleEn] = useState("");
  const [roundOpensAt, setRoundOpensAt] = useState("");
  const [roundClosesAt, setRoundClosesAt] = useState("");

  const kpis = overviewQuery.data?.kpis;

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

  const bank = questionBankQuery.data ?? [];
  const pickedScalesOk = (["autonomy", "competence", "relatedness"] as const).every((s) =>
    bank.some((q) => q.scale === s && pickedKeys.includes(q.key)),
  );
  const toggleKey = (key: string) =>
    setPickedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const openNewRound = () => {
    setRoundTitleEn("");
    setRoundOpensAt(new Date().toISOString().slice(0, 10));
    setRoundClosesAt("");
    setPickedKeys((questionBankQuery.data ?? []).filter((q) => q.isDefault).map((q) => q.key));
    setNewRoundOpen(true);
  };

  const submitNewRound = () => {
    if (!roundTitleEn.trim() || !roundOpensAt || !pickedScalesOk) return;
    createSurveyRound.mutate(
      {
        titleEn: roundTitleEn.trim(),
        opensAt: new Date(roundOpensAt).toISOString(),
        closesAt: roundClosesAt ? new Date(roundClosesAt).toISOString() : undefined,
        questionKeys: pickedKeys,
      },
      {
        onSuccess: () => {
          toast.success(t("admin.surveyCreateToast"));
          setNewRoundOpen(false);
        },
        onError: () => toast.error(t("admin.newSurveyRound")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle")}
      />

      <div className="stat-grid">
        <StatCard
          icon={Users}
          label={t("admin.kpiActive")}
          value={formatNumber(kpis?.activeParticipants ?? 0, lang)}
          hint={`/ ${formatNumber(kpis?.totalEligible ?? 0, lang)}`}
        />
        <StatCard
          icon={Activity}
          label={t("admin.kpiParticipation")}
          value={`${formatNumber(kpis?.participationRate ?? 0, lang)}%`}
          tone="gold"
        />
        <StatCard
          icon={ClipboardList}
          label={t("admin.kpiKudos")}
          value={formatNumber(kpis?.kudos30d ?? 0, lang)}
        />
        <StatCard
          icon={BarChart3}
          label={t("admin.kpiQuests")}
          value={formatNumber(kpis?.questsCompleted30d ?? 0, lang)}
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
              <ParticipationChart data={overviewQuery.data?.participationTrend ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.xpByDept")}</CardTitle>
            </CardHeader>
            <CardContent>
              <XpByDeptChart data={overviewQuery.data?.xpByDepartment ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.badgeDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDistributionChart data={overviewQuery.data?.badgeDistribution ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.tabs.surveys")}</CardTitle>
            </CardHeader>
            <CardContent>
              {sdtScoresQuery.data?.suppressed ? (
                <p className="flex h-[200px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  {t("admin.sdtScoresSuppressed")}
                </p>
              ) : (
                <SdtScoresChart data={sdtScoresQuery.data?.scores ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographics — gender only for now: the other demo dimensions
            (academic/administrative split, college) aren't backed by real
            data yet (no employmentType column; college is never set by the
            real user form), so they're dropped rather than shown empty. */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.filterGender")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DemographicsBar data={demographicsQuery.data?.byGender ?? []} />
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
          <QuestManager />
        </TabsContent>

        {/* Surveys */}
        <TabsContent value="surveys" className="space-y-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-3 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{t("admin.surveyTitle")}</p>
                  <p>{t("admin.surveyDesc")}</p>
                </div>
              </div>
              <Button size="sm" className="shrink-0 gap-2" onClick={openNewRound}>
                <Plus className="h-4 w-4" />
                {t("admin.newSurveyRound")}
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            {(surveyRoundsQuery.data ?? []).map((s) => {
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
                {(auditQuery.data ?? []).map((a) => (
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

      <Dialog open={newRoundOpen} onOpenChange={setNewRoundOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.newSurveyRound")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("admin.surveyRoundTitleLabel")}</Label>
              <Input value={roundTitleEn} onChange={(e) => setRoundTitleEn(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("admin.surveyOpensLabel")}</Label>
                <Input type="date" value={roundOpensAt} onChange={(e) => setRoundOpensAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.surveyClosesLabel")}</Label>
                <Input type="date" value={roundClosesAt} onChange={(e) => setRoundClosesAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("admin.surveyQuestionsLabel")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("admin.surveyQuestionsSelected", { n: formatNumber(pickedKeys.length, lang) })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.surveyQuestionsHint")}</p>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
                {(["autonomy", "competence", "relatedness"] as const).map((scale) => (
                  <div key={scale} className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`admin.surveyScale.${scale}`)}
                    </p>
                    {bank
                      .filter((q) => q.scale === scale)
                      .map((q) => (
                        <label key={q.key} className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={pickedKeys.includes(q.key)}
                            onChange={() => toggleKey(q.key)}
                          />
                          <span className="flex-1">{t2(q.text)}</span>
                        </label>
                      ))}
                  </div>
                ))}
              </div>
              {!pickedScalesOk && (
                <p className="text-xs text-destructive">{t("admin.surveyQuestionsNeedEach")}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoundOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitNewRound}
              disabled={createSurveyRound.isPending || !roundTitleEn.trim() || !roundOpensAt || !pickedScalesOk}
            >
              {t("admin.surveyCreateSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

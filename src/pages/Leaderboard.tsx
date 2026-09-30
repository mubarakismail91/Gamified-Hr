import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Building2, Minus, TrendingUp, Trophy } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, cn } from "@/lib/utils";
import {
  departmentById,
  departmentTopPerformer,
  managedDepartment,
  mostImprovedEmployee,
  rankedLeaderboard,
  topDepartmentsByAvgXp,
  type Metric,
  type Period,
  type Scope,
} from "@/store/selectors";

const ALL_DEPARTMENTS = "__all__";

export default function Leaderboard() {
  const { t } = useTranslation();
  const { lang, t2 } = useLocale();
  const { user, role } = useSession();
  const { state } = useDemoData();

  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>("dept");
  const [metric, setMetric] = useState<Metric>("points");
  // Admin-only: null = "All Departments (University-wide)", otherwise a specific department id.
  const [adminDept, setAdminDept] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      rankedLeaderboard(state, {
        period,
        scope,
        metric,
        viewerId: user.id,
        departmentId: role === "admin" ? adminDept : undefined,
      }),
    [state, period, scope, metric, user.id, role, adminDept],
  );
  const mine = role === "employee" ? rows.find((r) => r.staffId === user.id) : undefined;

  const managerDept = role === "manager" ? managedDepartment(state, user.id) : undefined;
  const teamTopPerformer = managerDept ? departmentTopPerformer(state, managerDept.id, period) : undefined;

  const adminSelectedDept = role === "admin" && adminDept ? departmentById(state, adminDept) : undefined;
  const topDepts = role === "admin" && !adminDept ? topDepartmentsByAvgXp(state, period, 3) : [];
  const adminDeptTopPerformer =
    role === "admin" && adminDept ? departmentTopPerformer(state, adminDept, period) : undefined;
  const improved = role === "admin" ? mostImprovedEmployee(state, period, adminDept) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={t("leaderboard.title")} subtitle={t("leaderboard.subtitle")} />

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Filter label={t("leaderboard.filterPeriod")}>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("common.thisWeek")}</SelectItem>
              <SelectItem value="month">{t("common.thisMonth")}</SelectItem>
            </SelectContent>
          </Select>
        </Filter>
        {role === "admin" ? (
          <Filter label={t("leaderboard.filterDepartment")}>
            <Select value={adminDept ?? ALL_DEPARTMENTS} onValueChange={(v) => setAdminDept(v === ALL_DEPARTMENTS ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>{t("leaderboard.allDepartments")}</SelectItem>
                {state.departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {t2(d.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
        ) : (
          <Filter label={t("leaderboard.filterScope")}>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dept">{t("leaderboard.scopeDept")}</SelectItem>
                <SelectItem value="uni">{t("leaderboard.scopeUni")}</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
        )}
        <Filter label={t("leaderboard.filterMetric")}>
          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="points">{t("leaderboard.metricPoints")}</SelectItem>
              <SelectItem value="progress">{t("leaderboard.metricProgress")}</SelectItem>
            </SelectContent>
          </Select>
        </Filter>
      </div>

      {metric === "progress" && (
        <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {t("leaderboard.progressNote")}
        </p>
      )}

      {/* Your position — Employee only; Managers/Admins aren't ranked */}
      {mine && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-2xl font-bold tabular-nums text-primary">
              #{formatNumber(mine.position, lang)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("leaderboard.yourPosition")}</p>
              <p className="text-xs text-muted-foreground">
                {t("leaderboard.outOf", { total: formatNumber(rows.length, lang) })} ·{" "}
                {formatNumber(metric === "points" ? mine.points : mine.progress, lang)} {t("common.xp")}
              </p>
            </div>
            <DeltaPill delta={mine.deltaRank} />
          </CardContent>
        </Card>
      )}

      {/* Manager summary — their own team's performance, not a personal rank */}
      {role === "manager" && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("leaderboard.teamTopPerformer")}</p>
              <p className="text-xs text-muted-foreground">
                {teamTopPerformer
                  ? `${t2(teamTopPerformer.staff.name)} · ${formatNumber(teamTopPerformer.points, lang)} ${t("common.xp")}`
                  : t("leaderboard.teamEmpty")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin summary — university-wide highlights, not a personal rank */}
      {role === "admin" && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="flex-1">
                {adminSelectedDept ? (
                  <>
                    <p className="text-sm font-semibold">
                      {t("leaderboard.deptTopPerformer", { dept: t2(adminSelectedDept.name) })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {adminDeptTopPerformer
                        ? `${t2(adminDeptTopPerformer.staff.name)} · ${formatNumber(adminDeptTopPerformer.points, lang)} ${t("common.xp")}`
                        : t("leaderboard.teamEmpty")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">{t("leaderboard.topDepartment")}</p>
                    <p className="text-xs text-muted-foreground">
                      {topDepts.length > 0
                        ? `${t2(topDepts[0].department.name)} · ${formatNumber(topDepts[0].avgPoints, lang)} ${t("common.xp")} ${t("leaderboard.avgSuffix")}`
                        : t("leaderboard.teamEmpty")}
                    </p>
                  </>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("leaderboard.mostImproved")}</p>
                <p className="text-xs text-muted-foreground">
                  {improved
                    ? `${t2(improved.staff.name)} · +${formatNumber(improved.progress, lang)} ${t("common.xp")}`
                    : t("leaderboard.teamEmpty")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className={rows.length === 0 ? undefined : "p-0"}>
          {rows.length === 0 && <EmptyState icon={Trophy} title={t("leaderboard.teamEmpty")} />}
          <ul className="divide-y">
            {rows.map((r) => {
              const isMe = r.staffId === user.id;
              const val = metric === "points" ? r.points : r.progress;
              return (
                <li
                  key={r.staffId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    isMe && "bg-primary/[0.05]",
                  )}
                >
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center text-sm font-bold tabular-nums",
                      r.position <= 3 ? "text-[hsl(var(--gold))]" : "text-muted-foreground",
                    )}
                  >
                    {formatNumber(r.position, lang)}
                  </span>
                  <PersonAvatar person={r.staff} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t2(r.staff.name)}
                      {isMe && (
                        <Badge variant="secondary" className="ms-2 align-middle">
                          {t("common.you")}
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{t2(r.staff.department)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatNumber(val, lang)}
                    <span className="ms-1 text-xs font-normal text-muted-foreground">{t("common.xp")}</span>
                  </span>
                  <DeltaPill delta={r.deltaRank} />
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="flex w-12 shrink-0 items-center justify-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  const up = delta > 0;
  return (
    <span
      className={cn(
        "flex w-12 shrink-0 items-center justify-center gap-0.5 text-xs font-semibold",
        up ? "text-success" : "text-destructive",
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  );
}

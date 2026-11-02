import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ClipboardCheck, Sparkles, Swords, Users2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/EmptyState";
import { DateStamp } from "@/components/common/DateStamp";
import { SubmitWorkDialog } from "@/components/quests/SubmitWorkDialog";
import { QuestDetailDialog } from "@/components/quests/QuestDetailDialog";
import { useSession } from "@/context/SessionContext";
import { useMyQuestViews } from "@/queries/useMyQuestViews";
import { useAcceptQuestMutation, useAdvanceQuestMutation } from "@/queries/useAssignments";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, cn } from "@/lib/utils";
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL_KEY } from "@/lib/questDisplay";
import type { QuestView } from "@/queries/useMyQuestViews";

export default function Quests() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { role } = useSession();
  const { views } = useMyQuestViews();
  const acceptMutation = useAcceptQuestMutation();
  const advanceMutation = useAdvanceQuestMutation();
  const daily = views.filter((v) => v.quest.cadence === "daily");
  const epic = views.filter((v) => v.quest.cadence === "epic");
  const [submittingView, setSubmittingView] = useState<QuestView | null>(null);
  // Keep only the id so the dialog re-reads the live view (ticks update it without reopening).
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailView = views.find((v) => v.quest.id === detailId) ?? null;

  if (role !== "employee") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("quests.title")} subtitle={t("quests.subtitle")} />
        <EmptyState
          icon={Users2}
          title={t("quests.managerNotice")}
          hint={t("quests.managerNoticeHint")}
        />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to={role === "admin" ? "/admin" : "/manage-team"}>
              {role === "admin" ? t("nav.admin") : t("nav.manageTeam")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const accept = (v: QuestView) => {
    acceptMutation.mutate(v.quest.id, {
      onSuccess: () => toast.success(t("quests.acceptToast"), { description: t2(v.quest.title) }),
      onError: () => toast.error(t("quests.submitError")),
    });
  };

  const logProgress = (v: QuestView) => {
    if (!v.progress.id) return;
    advanceMutation.mutate(v.progress.id);
  };

  const allDailyDone = daily.length > 0 && daily.every((v) => v.progress.state === "completed");

  return (
    <div className="space-y-6">
      <PageHeader title={t("quests.title")} subtitle={t("quests.subtitle")} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-[hsl(var(--gold))]" />
          {t("quests.daily")}
        </h2>
        {allDailyDone ? (
          <EmptyState icon={CheckCircle2} title={t("quests.emptyDaily")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {daily.map((v) => (
              <QuestCard
                key={v.quest.id}
                view={v}
                onAccept={() => accept(v)}
                onLogProgress={() => logProgress(v)}
                onSubmit={() => setSubmittingView(v)}
                onViewDetail={() => setDetailId(v.quest.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Swords className="h-5 w-5 text-primary" />
          {t("quests.epic")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {epic.map((v) => (
            <QuestCard
              key={v.quest.id}
              view={v}
              onAccept={() => accept(v)}
              onLogProgress={() => logProgress(v)}
              onSubmit={() => setSubmittingView(v)}
              onViewDetail={() => setDetailId(v.quest.id)}
            />
          ))}
        </div>
      </section>

      <SubmitWorkDialog view={submittingView} onOpenChange={(o) => !o && setSubmittingView(null)} />
      <QuestDetailDialog view={detailView} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}

function QuestCard({
  view,
  onAccept,
  onLogProgress,
  onSubmit,
  onViewDetail,
}: {
  view: QuestView;
  onAccept: () => void;
  onLogProgress: () => void;
  onSubmit: () => void;
  onViewDetail: () => void;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { quest, progress } = view;
  const pct = quest.steps ? Math.round((progress.stepsDone / quest.steps) * 100) : 0;
  const done = progress.state === "completed";
  const accepted = progress.state === "accepted";
  const pendingApproval = progress.state === "pending_approval";
  const hasSubtasks = (quest.subtasks?.length ?? 0) > 0;
  const hasMore = !!t2(quest.description) || !!quest.instructions?.en || hasSubtasks || (quest.attachments?.length ?? 0) > 0;
  const stepsRemain = accepted && progress.stepsDone < quest.steps;
  const readyToSubmit = accepted && progress.stepsDone >= quest.steps;

  return (
    <Card className={cn("flex flex-col", done && "opacity-75")}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{t2(quest.title)}</CardTitle>
          <Badge variant="gold" className="shrink-0 gap-1 whitespace-nowrap">
            +{formatNumber(quest.xp, lang)} {t("common.xp")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{t2(quest.category)}</Badge>
          <Badge variant={DIFFICULTY_BADGE_VARIANT[quest.difficulty]}>
            {t(DIFFICULTY_LABEL_KEY[quest.difficulty])}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {hasMore && (
          <div className="space-y-0.5">
            {t2(quest.description) && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{t2(quest.description)}</p>
            )}
            <button
              type="button"
              onClick={onViewDetail}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("quests.readMore")}
            </button>
          </div>
        )}

        {progress.rejectionNote && (
          <p className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
            {t("quests.rejectedNote", { note: progress.rejectionNote })}
          </p>
        )}

        {(accepted || done || pendingApproval) && (quest.steps > 1 || hasSubtasks) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("quests.progress", { done: progress.stepsDone, total: quest.steps })}</span>
              <span>{pct}%</span>
            </div>
            <Progress value={done ? 100 : pct} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {quest.due ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <DateStamp date={quest.due} inline />
            </span>
          ) : (
            <span />
          )}

          {done ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("quests.completed")}
            </Badge>
          ) : pendingApproval ? (
            <Badge variant="gold" className="gap-1">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t("quests.pendingApproval")}
            </Badge>
          ) : stepsRemain ? (
            <Button size="sm" variant="outline" onClick={hasSubtasks ? onViewDetail : onLogProgress}>
              {hasSubtasks ? t("quests.reviewChecklist") : t("quests.logProgress")}
            </Button>
          ) : readyToSubmit ? (
            <Button size="sm" onClick={onSubmit}>
              {t("quests.submitForReview")}
            </Button>
          ) : (
            <Button size="sm" onClick={onAccept}>
              {t("quests.accept")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


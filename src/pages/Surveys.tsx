import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useActiveSurveysQuery, useSubmitSurveyResponseMutation } from "@/queries/useSurveys";
import type { ActiveSurvey } from "@/api/surveyApi";

const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7];

export default function Surveys() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const activeQuery = useActiveSurveysQuery();
  const submitResponse = useSubmitSurveyResponseMutation();
  const rounds = activeQuery.data ?? [];

  const [active, setActive] = useState<ActiveSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const openRound = (round: ActiveSurvey) => {
    setActive(round);
    setAnswers({});
  };

  const submit = () => {
    if (!active) return;
    if (Object.keys(answers).length !== active.questions.length) {
      toast.error(t("surveys.incompleteWarning"));
      return;
    }
    submitResponse.mutate(
      { roundId: active.id, answers },
      {
        onSuccess: () => {
          toast.success(t("surveys.submittedToast"));
          setActive(null);
        },
        onError: () => toast.error(t("surveys.incompleteWarning")),
      },
    );
  };

  if (active) {
    return (
      <div className="space-y-6">
        <PageHeader title={t2(active.title)} subtitle={t("surveys.anonymousNote")} />

        <div className="space-y-4">
          {active.questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium">{t2(q.text)}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="hidden text-[11px] text-muted-foreground sm:block">{t("surveys.scaleLow")}</span>
                  <div className="flex gap-1.5">
                    {SCALE_VALUES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                          answers[q.id] === v
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-secondary",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="hidden text-[11px] text-muted-foreground sm:block">{t("surveys.scaleHigh")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActive(null)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitResponse.isPending}>
            {t("surveys.submit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("surveys.title")} subtitle={t("surveys.subtitle")} />

      {rounds.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("surveys.empty")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rounds.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{t2(r.title)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{t("surveys.anonymousNote")}</p>
                <Button onClick={() => openRound(r)} className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  {t("surveys.start")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

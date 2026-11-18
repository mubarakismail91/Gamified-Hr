import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateStamp } from "@/components/common/DateStamp";
import { useGiveConsentMutation, useMyResearchConsentQuery, useWithdrawConsentMutation } from "@/queries/useResearch";

/**
 * Opt-in to the research track (report Section 4.4.7, Track B). Joining links the employee's FUTURE
 * survey answers to a research code; leaving deletes every linked answer. Nothing here changes the
 * anonymous pulse survey, which everyone takes the same way.
 */
export function ResearchConsentCard() {
  const { t } = useTranslation();
  const consentQuery = useMyResearchConsentQuery();
  const give = useGiveConsentMutation();
  const withdraw = useWithdrawConsentMutation();
  const [reviewing, setReviewing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const consent = consentQuery.data;
  if (!consent?.available) return null;

  const join = () =>
    give.mutate(undefined, {
      onSuccess: () => {
        setReviewing(false);
        toast.success(t("research.joinedToast"));
      },
    });

  const leave = () =>
    withdraw.mutate(undefined, {
      onSuccess: () => {
        setConfirmLeave(false);
        toast.success(t("research.leftToast"));
      },
    });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base">{t("research.cardTitle")}</CardTitle>
          </div>
          {consent.consented && <Badge variant="success">{t("research.joinedBadge")}</Badge>}
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {consent.consented ? (
            <>
              <p>
                {t("research.joinedOn")} {consent.consentedAt && <DateStamp date={new Date(consent.consentedAt)} inline />}
              </p>
              <p>{t("research.joinedExplain")}</p>
              <Button variant="outline" size="sm" onClick={() => setConfirmLeave(true)}>
                {t("research.leave")}
              </Button>
            </>
          ) : (
            <>
              <p>{t("research.invite")}</p>
              <Button variant="outline" size="sm" onClick={() => setReviewing(true)}>
                {t("research.readAndJoin")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Consent information — what joining means, before they agree. */}
      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("research.consentTitle")}</DialogTitle>
          </DialogHeader>
          <ul className="list-disc space-y-2 ps-5 text-sm">
            <li>{t("research.point.purpose")}</li>
            <li>{t("research.point.linked")}</li>
            <li>{t("research.point.pseudonym")}</li>
            <li>{t("research.point.notBackdated")}</li>
            <li>{t("research.point.withdraw")}</li>
            <li>{t("research.point.noEffect")}</li>
            <li>{t("research.point.retention")}</li>
          </ul>
          <p className="text-xs text-muted-foreground">{t("research.version", { version: consent.consentVersion })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={join} disabled={give.isPending}>
              {t("research.agree")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaving deletes linked answers, so confirm first. */}
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("research.leaveTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("research.leaveExplain")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={leave} disabled={withdraw.isPending}>
              {t("research.leaveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

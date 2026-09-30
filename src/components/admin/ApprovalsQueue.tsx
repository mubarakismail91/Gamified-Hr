import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, FileText, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DateStamp } from "@/components/common/DateStamp";
import { EmptyState } from "@/components/common/EmptyState";
import { SubmissionPreviewDialog } from "./SubmissionPreviewDialog";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { usePendingApprovals } from "@/store/hooks";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import type { PendingApproval } from "@/store/selectors";
import type { QuestSubmission } from "@/data";

export function ApprovalsQueue({
  departmentId,
  limit,
}: {
  /** null = every department (Admin view). */
  departmentId: string | null;
  limit?: number;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user } = useSession();
  const { approveQuest, rejectQuest } = useDemoData();
  const rows = usePendingApprovals(departmentId);
  const shown = limit ? rows.slice(0, limit) : rows;

  const [rejecting, setRejecting] = useState<PendingApproval | null>(null);
  const [note, setNote] = useState("");
  const [previewing, setPreviewing] = useState<QuestSubmission | null>(null);

  const approve = (row: PendingApproval) => {
    approveQuest(row.quest.id, row.user.id, user.id);
    toast.success(t("approvals.toastApproved"), { description: t2(row.quest.title) });
  };

  const confirmReject = () => {
    if (!rejecting) return;
    rejectQuest(rejecting.quest.id, rejecting.user.id, user.id, note.trim() || undefined);
    toast.success(t("approvals.toastRejected"), { description: t2(rejecting.quest.title) });
    setRejecting(null);
    setNote("");
  };

  if (shown.length === 0) {
    return <EmptyState icon={Check} title={t("approvals.empty")} />;
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("approvals.employee")}</TableHead>
              <TableHead>{t("approvals.quest")}</TableHead>
              <TableHead>{t("approvals.submitted")}</TableHead>
              <TableHead className="text-end">{t("admin.questTableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={`${row.quest.id}:${row.user.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar person={row.user} size="sm" />
                    <span className="truncate text-sm font-medium">{t2(row.user.name)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{t2(row.quest.title)}</span>
                  <Badge variant="gold" className="ms-2">
                    +{formatNumber(row.quest.xp, lang)} {t("common.xp")}
                  </Badge>
                  <div className="mt-1 space-y-0.5">
                    {row.submission?.fileName ? (
                      <button
                        type="button"
                        onClick={() => row.submission && setPreviewing(row.submission)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-[180px] truncate">{row.submission.fileName}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("approvals.noFile")}</span>
                    )}
                    {row.submission?.notes && (
                      <p
                        className="max-w-[220px] truncate text-xs text-muted-foreground"
                        title={row.submission.notes}
                      >
                        {row.submission.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.progress.submittedAt && <DateStamp date={row.progress.submittedAt} relative inline />}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRejecting(row)}>
                      <X className="h-3.5 w-3.5" />
                      {t("approvals.reject")}
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => approve(row)}>
                      <Check className="h-3.5 w-3.5" />
                      {t("approvals.approve")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("approvals.rejectPromptTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("approvals.rejectPromptPlaceholder")}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              {t("approvals.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmissionPreviewDialog submission={previewing} onOpenChange={(o) => !o && setPreviewing(null)} />
    </>
  );
}

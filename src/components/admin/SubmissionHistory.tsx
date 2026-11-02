import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DateStamp } from "@/components/common/DateStamp";
import { EmptyState } from "@/components/common/EmptyState";
import { SubmissionPreviewDialog } from "./SubmissionPreviewDialog";
import { useSubmissionHistoryQuery } from "@/queries/useAssignments";
import { useLocale } from "@/hooks/useLocale";
import type { SubmissionHistoryRow } from "@/api/assignmentApi";

export function SubmissionHistory({ departmentId }: { departmentId: string }) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const historyQuery = useSubmissionHistoryQuery(departmentId);
  const rows = historyQuery.data ?? [];
  const [previewing, setPreviewing] = useState<SubmissionHistoryRow | null>(null);

  if (rows.length === 0) {
    return <EmptyState icon={History} title={t("approvals.historyEmpty")} />;
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("approvals.employee")}</TableHead>
              <TableHead>{t("approvals.quest")}</TableHead>
              <TableHead>{t("admin.questTableStatus")}</TableHead>
              <TableHead>{t("approvals.submitted")}</TableHead>
              <TableHead className="text-end">{t("admin.questTableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.submission.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar person={row.user} size="sm" />
                    <span className="truncate text-sm font-medium">{t2(row.user.name)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {t2(row.quest.title)}
                  {row.submission.notes && (
                    <p
                      className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground"
                      title={row.submission.notes}
                    >
                      {row.submission.notes}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={row.submission.status === "approved" ? "success" : "destructive"}>
                    {t(row.submission.status === "approved" ? "approvals.decisionApproved" : "approvals.decisionDenied")}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.submission.reviewedAt && <DateStamp date={row.submission.reviewedAt} relative inline />}
                </TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewing(row)}>
                    {row.submission.fileName ? t("approvals.viewFile") : t("approvals.viewDetails")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SubmissionPreviewDialog
        submission={previewing?.submission ?? null}
        onOpenChange={(o) => !o && setPreviewing(null)}
      />
    </>
  );
}

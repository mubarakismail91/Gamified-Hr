import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eraser, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateStamp } from "@/components/common/DateStamp";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { eraseUser, getPrivacyPolicy, listDeactivated, runRetention, type DeactivatedUser } from "@/api/privacyApi";

/** Admin → Privacy: the retention policy in force, an on-demand cleanup, and erasing deactivated accounts. */
export function PrivacyPanel() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const qc = useQueryClient();
  const policy = useQuery({ queryKey: ["privacy", "policy"], queryFn: getPrivacyPolicy });
  const deactivated = useQuery({ queryKey: ["privacy", "deactivated"], queryFn: listDeactivated });
  const [erasing, setErasing] = useState<DeactivatedUser | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);

  const erase = useMutation({
    mutationFn: eraseUser,
    onSuccess: () => {
      setErasing(null);
      toast.success(t("privacy.admin.erased"));
      qc.invalidateQueries({ queryKey: ["privacy"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: () => toast.error(t("privacy.admin.eraseFailed")),
  });
  const run = useMutation({
    mutationFn: runRetention,
    onSuccess: (r) => {
      setConfirmRun(false);
      toast.success(
        t("privacy.admin.runResult", {
          notifications: formatNumber(r.notificationsDeleted, lang),
          sessions: formatNumber(r.sessionsDeleted, lang),
          accounts: formatNumber(r.accountsAnonymised, lang),
        }),
      );
      qc.invalidateQueries({ queryKey: ["privacy"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const p = policy.data;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{t("privacy.admin.retentionTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {p?.jobEnabled ? t("privacy.admin.jobOn") : t("privacy.admin.jobOff")}
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setConfirmRun(true)}>
            <RefreshCcw className="h-4 w-4" />
            {t("privacy.admin.runNow")}
          </Button>
        </CardHeader>
        <CardContent>
          {p && (
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              <li>{t("privacy.retention.notifications", { days: formatNumber(p.notificationsDays, lang) })}</li>
              <li>{t("privacy.retention.accounts", { days: formatNumber(p.deactivatedAccountsDays, lang) })}</li>
              <li>{t("privacy.retention.sessions", { days: formatNumber(p.revokedSessionsDays, lang) })}</li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t("privacy.admin.deactivatedTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("privacy.admin.deactivatedHint")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("privacy.admin.person")}</TableHead>
                <TableHead>{t("privacy.admin.deactivatedOn")}</TableHead>
                <TableHead className="text-end">{t("privacy.admin.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(deactivated.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                    {t("privacy.admin.noneDeactivated")}
                  </TableCell>
                </TableRow>
              )}
              {(deactivated.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{t2(u.name)}</p>
                    {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.deactivatedAt ? <DateStamp date={new Date(u.deactivatedAt)} inline /> : "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    {u.erasedAt ? (
                      <Badge variant="muted">{t("privacy.admin.erasedBadge")}</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" className="gap-2 text-destructive" onClick={() => setErasing(u)}>
                        <Eraser className="h-4 w-4" />
                        {t("privacy.admin.erase")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!erasing} onOpenChange={(o) => !o && setErasing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("privacy.admin.eraseTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("privacy.admin.eraseBody", { name: erasing ? t2(erasing.name) : "" })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErasing(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => erasing && erase.mutate(erasing.id)} disabled={erase.isPending}>
              {t("privacy.admin.eraseConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRun} onOpenChange={setConfirmRun}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("privacy.admin.runTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("privacy.admin.runBody")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRun(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              {t("privacy.admin.runNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

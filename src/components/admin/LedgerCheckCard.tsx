import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/client";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";

interface VerifyResult {
  ok: boolean;
  checkedUsers: number;
  checkedRows: number;
  problems: { userId: string; name: string; seq?: number; issue: string }[];
}

/** Admin → Audit trail: re-checks every person's XP hash chain and that totals agree (item 11). */
export function LedgerCheckCard() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const qc = useQueryClient();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    try {
      setResult((await apiClient.get<VerifyResult>("/ledger/verify")).data);
      qc.invalidateQueries({ queryKey: ["audit"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            {t("ledger.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("ledger.explain")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={verify} disabled={busy}>
          {t("ledger.verify")}
        </Button>
      </CardHeader>
      {result && (
        <CardContent className="space-y-2 text-sm">
          {result.ok ? (
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              {t("ledger.ok", { users: formatNumber(result.checkedUsers, lang), rows: formatNumber(result.checkedRows, lang) })}
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-medium text-destructive">
                <TriangleAlert className="h-4 w-4" />
                {t("ledger.problems", { n: formatNumber(result.problems.length, lang) })}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                {result.problems.map((p, i) => (
                  <li key={i}>
                    {p.name}
                    {p.seq !== undefined && ` · #${p.seq}`}: {p.issue}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

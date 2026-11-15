import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useResearchStatusQuery } from "@/queries/useResearch";
import { downloadResearchExport, type ResearchDataset } from "@/api/researchApi";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, saveBlob } from "@/lib/utils";

/** Admin → SDT surveys: the two research exports. Each download is written to the audit trail by the server. */
export function ResearchExportCard() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const status = useResearchStatusQuery();
  const [busy, setBusy] = useState<ResearchDataset | null>(null);

  const download = async (dataset: ResearchDataset) => {
    setBusy(dataset);
    try {
      const { blob, fileName } = await downloadResearchExport(dataset);
      saveBlob(blob, fileName);
    } catch {
      toast.error(t("research.exportFailed"));
    } finally {
      setBusy(null);
    }
  };

  const configured = status.data?.configured ?? false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <CardTitle className="text-base">{t("research.exportsTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {configured
              ? t("research.participantsCount", { n: formatNumber(status.data?.participants ?? 0, lang) })
              : t("research.notConfigured")}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">{t("research.aggregatesTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("research.aggregatesDesc")}</p>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => download("aggregates")} disabled={busy !== null}>
            <Download className="h-4 w-4" />
            {t("research.downloadCsv")}
          </Button>
        </div>
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">{t("research.participantsTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("research.participantsDesc")}</p>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => download("participants")}
            disabled={busy !== null || !configured}
          >
            <Download className="h-4 w-4" />
            {t("research.downloadCsv")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">{t("research.auditNote")}</p>
      </CardContent>
    </Card>
  );
}

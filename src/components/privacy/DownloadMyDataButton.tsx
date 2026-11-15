import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadMyData } from "@/api/privacyApi";
import { saveBlob } from "@/lib/utils";

/** PDPL right of access: saves everything held about the signed-in person as a JSON file. */
export function DownloadMyDataButton() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { blob, fileName } = await downloadMyData();
      saveBlob(blob, fileName);
    } catch {
      toast.error(t("privacy.downloadFailed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={download} disabled={busy}>
      <Download className="h-4 w-4" />
      {t("privacy.downloadMyData")}
    </Button>
  );
}

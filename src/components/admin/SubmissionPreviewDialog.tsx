import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getFile } from "@/store/fileStore";
import type { QuestSubmission } from "@/data";

export function SubmissionPreviewDialog({
  submission,
  onOpenChange,
}: {
  submission: QuestSubmission | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!submission?.fileKey) {
      setUrl(null);
      return;
    }
    const fileKey = submission.fileKey;
    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    getFile(fileKey).then((blob) => {
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [submission]);

  const hasFile = !!submission?.fileKey;
  const isImage = submission?.fileType?.startsWith("image/") ?? false;
  const isPdf = submission?.fileType === "application/pdf";

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">
            {submission?.fileName ?? t("approvals.submissionDetails")}
          </DialogTitle>
        </DialogHeader>

        {/* Guard on `submission` (not just `url`) so a stale `url` from the
            previous submission can't render during the dialog's close animation. */}
        {submission && (
          <>
            {!hasFile ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("approvals.noFile")}</p>
            ) : loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : !url ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("approvals.noFilePreview")}</p>
            ) : isImage ? (
              <img
                src={url}
                alt={submission.fileName}
                className="max-h-[60vh] w-full rounded-md border object-contain"
              />
            ) : isPdf ? (
              <iframe src={url} title={submission.fileName} className="h-[60vh] w-full rounded-md border" />
            ) : (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                <p className="mb-3">{t("approvals.previewUnavailable")}</p>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={url} download={submission.fileName}>
                    <Download className="h-4 w-4" />
                    {t("approvals.downloadFile")}
                  </a>
                </Button>
              </div>
            )}

            {submission.notes && (
              <div className="rounded-md bg-secondary/50 p-3 text-sm">
                <p className="mb-1 font-medium">{t("quests.notesLabel")}</p>
                <p className="text-muted-foreground">{submission.notes}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

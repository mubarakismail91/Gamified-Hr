import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import type { QuestView } from "@/store/selectors";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "txt",
  "xls", "xlsx", "ppt", "pptx",
];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmitWorkDialog({
  view,
  onOpenChange,
}: {
  view: QuestView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { user } = useSession();
  const { submitQuestWork } = useDemoData();

  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFile(null);
    setNotes("");
    setSubmitting(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast.error(t("quests.fileTooLarge"));
      e.target.value = "";
      setFile(null);
      return;
    }
    const ext = picked.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(t("quests.fileTypeNotAllowed"));
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const submit = async () => {
    if (!view) return;
    setSubmitting(true);
    try {
      await submitQuestWork(view.quest.id, user.id, file, notes.trim());
      toast.success(t("quests.submitToast"), { description: t2(view.quest.title) });
      handleClose(false);
    } catch {
      toast.error(t("quests.submitError"));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!view} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("quests.submitForReview")}</DialogTitle>
          {view && <DialogDescription>{t2(view.quest.title)}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              {view?.quest.requireFile ? t("quests.uploadLabelRecommended") : t("quests.uploadLabelOptional")}
            </Label>
            <Input type="file" accept={ACCEPT_ATTR} onChange={handleFileChange} />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <UploadCloud className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {view?.quest.requireFile ? t("quests.uploadHintRecommended") : t("quests.uploadHint")}
            </p>
            {file && (
              <p className="text-xs font-medium text-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("quests.notesLabel")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("quests.notesPlaceholder")}
              rows={3}
              maxLength={280}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("common.loading") : t("quests.submitForReview")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

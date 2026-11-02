import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock, Check, Clock, Download, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateStamp } from "@/components/common/DateStamp";
import { useLocale } from "@/hooks/useLocale";
import { useToggleSubtaskMutation } from "@/queries/useAssignments";
import { fetchQuestAttachmentBlob } from "@/api/questApi";
import { cn, formatBytes, formatNumber, saveBlob } from "@/lib/utils";
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL_KEY } from "@/lib/questDisplay";
import type { QuestAttachment } from "@/data";
import type { QuestView } from "@/store/selectors";

export function QuestDetailDialog({
  view,
  onOpenChange,
}: {
  view: QuestView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const toggleSubtask = useToggleSubtaskMutation();

  const download = async (questId: string, attachment: QuestAttachment) => {
    try {
      saveBlob(await fetchQuestAttachmentBlob(questId, attachment.id), attachment.fileName);
    } catch {
      toast.error(t("quests.downloadError"));
    }
  };

  return (
    <Dialog open={!!view} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {view && (() => {
          const { quest, progress } = view;
          const subtasks = quest.subtasks ?? [];
          const attachments = quest.attachments ?? [];
          const done = new Set(progress.completedSubtaskIds ?? []);
          const canTick = progress.state === "accepted" && !!progress.id;
          const pct = subtasks.length ? Math.round((done.size / subtasks.length) * 100) : 0;
          const instructions = quest.instructions ? t2(quest.instructions) : "";

          return (
            <>
              <DialogHeader>
                <DialogTitle>{t2(quest.title)}</DialogTitle>
                <DialogDescription>{t2(quest.category)}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="gold">
                  +{formatNumber(quest.xp, lang)} {t("common.xp")}
                </Badge>
                <Badge variant={DIFFICULTY_BADGE_VARIANT[quest.difficulty]}>
                  {t(DIFFICULTY_LABEL_KEY[quest.difficulty])}
                </Badge>
                <Badge variant="secondary">
                  {quest.cadence === "daily" ? t("quests.daily") : t("quests.epic")}
                </Badge>
                {quest.estimatedMinutes && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {t("quests.estimated", { n: formatNumber(quest.estimatedMinutes, lang) })}
                  </Badge>
                )}
              </div>

              {t2(quest.description) && <p className="text-sm text-muted-foreground">{t2(quest.description)}</p>}

              {instructions && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">{t("quests.instructions")}</h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{instructions}</p>
                </section>
              )}

              {subtasks.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t("quests.subtasks")}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t("quests.progress", { done: done.size, total: subtasks.length })}
                    </span>
                  </div>
                  {progress.state !== "available" && <Progress value={progress.state === "completed" ? 100 : pct} />}
                  <ul className="space-y-1.5">
                    {subtasks.map((st) => {
                      const ticked = done.has(st.id) || progress.state === "completed";
                      return (
                        <li key={st.id}>
                          <button
                            type="button"
                            disabled={!canTick || toggleSubtask.isPending}
                            onClick={() =>
                              progress.id && toggleSubtask.mutate({ assignmentId: progress.id, subtaskId: st.id })
                            }
                            className={cn(
                              "flex w-full items-start gap-2.5 rounded-md border p-2.5 text-start transition-colors",
                              canTick ? "hover:bg-secondary/60" : "cursor-default",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                ticked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                              )}
                            >
                              {ticked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn("block text-sm font-medium", ticked && "text-muted-foreground line-through")}>
                                {t2(st.title)}
                              </span>
                              {t2(st.description) && (
                                <span className="mt-0.5 block text-xs text-muted-foreground">{t2(st.description)}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {canTick ? t("quests.subtasksHint") : progress.state === "available" ? t("quests.startToTick") : ""}
                  </p>
                </section>
              )}

              {attachments.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">{t("quests.attachments")}</h3>
                  <ul className="space-y-1.5">
                    {attachments.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => download(quest.id, a)}
                          className="flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-start text-sm transition-colors hover:bg-secondary/60"
                        >
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.fileSize)}</span>
                          <Download className="h-4 w-4 shrink-0 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {quest.due && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <DateStamp date={quest.due} inline />
                </span>
              )}
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

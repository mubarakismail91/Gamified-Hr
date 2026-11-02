import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { ArrowDown, ArrowUp, ClipboardList, Paperclip, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useLocale } from "@/hooks/useLocale";
import {
  useQuestsQuery,
  useCreateQuestMutation,
  useUpdateQuestMutation,
  useDeleteQuestMutation,
  useUploadQuestAttachmentMutation,
  useDeleteQuestAttachmentMutation,
} from "@/queries/useQuests";
import { useDepartmentsQuery } from "@/queries/useDepartments";
import { useUsersQuery } from "@/queries/useUsers";
import { formatBytes, formatNumber } from "@/lib/utils";
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL_KEY } from "@/lib/questDisplay";
import type { Quest, QuestAttachment } from "@/data";

// Matches the backend's attachment allow-list (multer.config.ts) — the server check is the authoritative one.
const ATTACHMENT_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "doc", "docx", "txt",
  "xls", "xlsx", "ppt", "pptx",
  "csv", "zip", "mp3", "mp4", "mov",
];
const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Deadlines are whole days: a quest stays open through the end of the chosen date, local time. */
const toDateInput = (d?: Date | string) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const endOfDayIso = (dateInput: string) => new Date(`${dateInput}T23:59:59`).toISOString();

type SubtaskDraft = { id?: string; titleEn: string; descriptionEn: string };

const UNIVERSITY_WIDE = "__all__";
const EVERYONE = "__everyone__";

type Draft = {
  id?: string;
  titleEn: string;
  descriptionEn: string;
  cadence: Quest["cadence"];
  categoryEn: string;
  difficulty: Quest["difficulty"];
  xp: number;
  departmentId: string;
  assigneeId: string;
  status: Quest["status"];
  requireFile: boolean;
  instructionsEn: string;
  estimatedMinutes: string;
  /** yyyy-mm-dd, or empty for no deadline. */
  dueDate: string;
  subtasks: SubtaskDraft[];
  /** Files already stored on the quest (edit mode). */
  attachments: QuestAttachment[];
  /** Files picked but not yet uploaded — sent right after the quest is saved. */
  newFiles: File[];
};

function emptyDraft(fixedDepartmentId?: string): Draft {
  return {
    titleEn: "",
    descriptionEn: "",
    cadence: "daily",
    categoryEn: "",
    difficulty: "medium",
    xp: 30,
    departmentId: fixedDepartmentId ?? UNIVERSITY_WIDE,
    assigneeId: EVERYONE,
    // Published by default — a Manager/Admin creating a quest almost always
    // wants it live immediately; Draft is an explicit opt-out via the status field.
    status: "published",
    requireFile: false,
    instructionsEn: "",
    estimatedMinutes: "",
    dueDate: "",
    subtasks: [],
    attachments: [],
    newFiles: [],
  };
}

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && typeof err.response?.data?.message === "string") return err.response.data.message;
  return fallback;
}

export function QuestManager({ fixedDepartmentId }: { fixedDepartmentId?: string }) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();

  const questsQuery = useQuestsQuery();
  const departmentsQuery = useDepartmentsQuery();
  const usersQuery = useUsersQuery();
  const createQuest = useCreateQuestMutation();
  const updateQuest = useUpdateQuestMutation();
  const deleteQuest = useDeleteQuestMutation();
  const uploadAttachment = useUploadQuestAttachmentMutation();
  const deleteAttachment = useDeleteQuestAttachmentMutation();

  const rows = questsQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Quest | null>(null);
  const [reactivating, setReactivating] = useState<{ quest: Quest; dueDate: string } | null>(null);

  const openNew = () => setEditing(emptyDraft(fixedDepartmentId));
  const openEdit = (q: Quest) =>
    setEditing({
      id: q.id,
      titleEn: q.title.en,
      descriptionEn: q.description.en,
      cadence: q.cadence,
      categoryEn: q.category.en,
      difficulty: q.difficulty,
      xp: q.xp,
      departmentId: q.departmentId ?? UNIVERSITY_WIDE,
      assigneeId: q.assigneeId ?? EVERYONE,
      status: q.status,
      requireFile: q.requireFile ?? false,
      instructionsEn: q.instructions?.en ?? "",
      estimatedMinutes: q.estimatedMinutes ? String(q.estimatedMinutes) : "",
      dueDate: toDateInput(q.due),
      subtasks: (q.subtasks ?? []).map((st) => ({ id: st.id, titleEn: st.title.en, descriptionEn: st.description.en })),
      attachments: q.attachments ?? [],
      newFiles: [],
    });

  const save = async () => {
    if (!editing || !editing.titleEn.trim()) return;
    const departmentId = editing.departmentId === UNIVERSITY_WIDE ? null : editing.departmentId;
    const assigneeId = editing.assigneeId === EVERYONE ? undefined : editing.assigneeId;

    const payload = {
      titleEn: editing.titleEn,
      descriptionEn: editing.descriptionEn,
      cadence: editing.cadence,
      categoryEn: editing.categoryEn,
      difficulty: editing.difficulty,
      xp: editing.xp,
      departmentId,
      assigneeId,
      status: editing.status,
      requireFile: editing.requireFile,
      instructionsEn: editing.instructionsEn,
      dueAt: editing.dueDate ? endOfDayIso(editing.dueDate) : editing.id ? null : undefined,
      estimatedMinutes: Number(editing.estimatedMinutes) > 0 ? Number(editing.estimatedMinutes) : undefined,
      subtasks: editing.subtasks
        .filter((st) => st.titleEn.trim())
        .map((st) => ({ id: st.id, titleEn: st.titleEn.trim(), descriptionEn: st.descriptionEn.trim() })),
    };

    try {
      const saved = editing.id
        ? await updateQuest.mutateAsync({ id: editing.id, patch: payload })
        : await createQuest.mutateAsync(payload);

      // The quest has to exist before files can be attached to it.
      const results = await Promise.allSettled(
        editing.newFiles.map((file) => uploadAttachment.mutateAsync({ questId: saved.id, file })),
      );
      if (results.some((r) => r.status === "rejected")) toast.error(t("admin.attachUploadError"));

      toast.success(editing.id ? t("common.saveChanges") : t("admin.newQuest"));
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.newQuest")));
    }
  };

  const confirmReactivate = async () => {
    if (!reactivating) return;
    try {
      await updateQuest.mutateAsync({
        id: reactivating.quest.id,
        patch: { dueAt: reactivating.dueDate ? endOfDayIso(reactivating.dueDate) : null },
      });
      toast.success(t("admin.reactivatedToast"), { description: t2(reactivating.quest.title) });
      setReactivating(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.reactivate")));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteQuest.mutateAsync(deleting.id);
      toast.success(t("admin.deleteQuest"), { description: t2(deleting.title) });
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.deleteQuest")));
    }
  };

  // Team eligible for single-assignee targeting: everyone in the relevant
  // department except its manager, mirroring the old departmentTeam() selector.
  const teamFor = (departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    return users.filter((u) => u.departmentId === departmentId && u.id !== dept?.managerId);
  };

  const updateSubtask = (index: number, patch: Partial<SubtaskDraft>) =>
    setEditing((d) => d && { ...d, subtasks: d.subtasks.map((st, i) => (i === index ? { ...st, ...patch } : st)) });
  const moveSubtask = (index: number, delta: -1 | 1) =>
    setEditing((d) => {
      if (!d) return d;
      const subtasks = [...d.subtasks];
      [subtasks[index], subtasks[index + delta]] = [subtasks[index + delta], subtasks[index]];
      return { ...d, subtasks };
    });

  const pickFiles = (list: FileList | null) => {
    if (!list || !editing) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ATTACHMENT_EXTENSIONS.includes(ext)) {
        toast.error(t("quests.fileTypeNotAllowed"), { description: file.name });
      } else if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(t("quests.fileTooLarge"), { description: file.name });
      } else {
        accepted.push(file);
      }
    }
    setEditing({ ...editing, newFiles: [...editing.newFiles, ...accepted] });
  };

  const removeStoredAttachment = async (attachment: QuestAttachment) => {
    if (!editing?.id) return;
    try {
      await deleteAttachment.mutateAsync({ questId: editing.id, attachmentId: attachment.id });
      setEditing((d) => d && { ...d, attachments: d.attachments.filter((a) => a.id !== attachment.id) });
    } catch (err) {
      toast.error(errorMessage(err, t("admin.removeFile")));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.newQuest")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("admin.noQuests")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.questTableName")}</TableHead>
                <TableHead>{t("admin.questTableCategory")}</TableHead>
                <TableHead>{t("quests.difficulty")}</TableHead>
                <TableHead>{t("admin.questTableVisibility")}</TableHead>
                <TableHead>{t("admin.questTableStatus")}</TableHead>
                <TableHead className="text-end">{t("admin.questTableActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => {
                const dept = departments.find((d) => d.id === q.departmentId);
                const assignee = q.assigneeId ? users.find((u) => u.id === q.assigneeId) : undefined;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      <div>
                        {t2(q.title)}
                        <span className="ms-2 text-xs text-muted-foreground">
                          +{formatNumber(q.xp, lang)} {t("common.xp")}
                        </span>
                      </div>
                      {q.description.en && (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-xs font-normal text-muted-foreground">
                          {t2(q.description)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{t2(q.category)}</TableCell>
                    <TableCell>
                      <Badge variant={DIFFICULTY_BADGE_VARIANT[q.difficulty]}>
                        {t(DIFFICULTY_LABEL_KEY[q.difficulty])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dept ? (
                          <Badge variant="muted">{t2(dept.name)}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("admin.visibilityAll")}</Badge>
                        )}
                        {assignee && <Badge variant="outline">{t2(assignee.name)}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={q.status === "published" ? "success" : "muted"}>
                          {q.status === "published" ? t("admin.statusPublished") : t("admin.statusDraft")}
                        </Badge>
                        {q.expired && <Badge variant="destructive">{t("admin.expired")}</Badge>}
                      </div>
                      {q.due && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("admin.deadlineShort", { date: toDateInput(q.due) })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {q.expired && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReactivating({ quest: q, dueDate: "" })}
                            aria-label={t("admin.reactivate")}
                            title={t("admin.reactivate")}
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label={t("common.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(q)}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.editQuest") : t("admin.newQuest")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("admin.questTableName")}</Label>
                <Input
                  value={editing.titleEn}
                  onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.descriptionLabel")}</Label>
                <Textarea
                  value={editing.descriptionEn}
                  onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })}
                  placeholder={t("admin.descriptionPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.instructionsLabel")}</Label>
                <Textarea
                  value={editing.instructionsEn}
                  onChange={(e) => setEditing({ ...editing, instructionsEn: e.target.value })}
                  placeholder={t("admin.instructionsPlaceholder")}
                  rows={5}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("admin.estimatedLabel")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.estimatedMinutes}
                  onChange={(e) => setEditing({ ...editing, estimatedMinutes: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("admin.deadlineLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={editing.dueDate}
                    onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                  />
                  {editing.dueDate && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing({ ...editing, dueDate: "" })}
                    >
                      {t("admin.clearDeadline")}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.deadlineHint")}</p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label>{t("admin.subtasksLabel")}</Label>
                  <p className="text-xs text-muted-foreground">{t("admin.subtasksHint")}</p>
                </div>
                {editing.subtasks.map((st, i) => (
                  <div key={st.id ?? `new-${i}`} className="flex items-start gap-2 rounded-md border p-2">
                    <span className="mt-2 w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        value={st.titleEn}
                        onChange={(e) => updateSubtask(i, { titleEn: e.target.value })}
                        placeholder={t("admin.subtaskTitlePlaceholder")}
                      />
                      <Input
                        value={st.descriptionEn}
                        onChange={(e) => updateSubtask(i, { descriptionEn: e.target.value })}
                        placeholder={t("admin.subtaskDetailPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => moveSubtask(i, -1)}
                        aria-label={t("admin.moveUp")}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === editing.subtasks.length - 1}
                        onClick={() => moveSubtask(i, 1)}
                        aria-label={t("admin.moveDown")}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditing({ ...editing, subtasks: editing.subtasks.filter((_, j) => j !== i) })}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setEditing({ ...editing, subtasks: [...editing.subtasks, { titleEn: "", descriptionEn: "" }] })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t("admin.addSubtask")}
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <Label>{t("admin.attachmentsLabel")}</Label>
                  <p className="text-xs text-muted-foreground">{t("admin.attachmentsHint")}</p>
                </div>
                {(editing.attachments.length > 0 || editing.newFiles.length > 0) && (
                  <ul className="space-y-1.5">
                    {editing.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.fileSize)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeStoredAttachment(a)}
                          aria-label={t("admin.removeFile")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                    {editing.newFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setEditing({ ...editing, newFiles: editing.newFiles.filter((_, j) => j !== i) })
                          }
                          aria-label={t("admin.removeFile")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                  <label className="cursor-pointer">
                    <Paperclip className="h-4 w-4" />
                    {t("admin.addFiles")}
                    <input
                      type="file"
                      multiple
                      accept={ATTACHMENT_ACCEPT}
                      className="sr-only"
                      onChange={(e) => {
                        pickFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("quests.categoryLabel")}</Label>
                  <Input
                    value={editing.categoryEn}
                    onChange={(e) => setEditing({ ...editing, categoryEn: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.xp")}</Label>
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={editing.xp}
                    onChange={(e) => setEditing({ ...editing, xp: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("quests.daily")} / {t("quests.epic")}</Label>
                  <Select
                    value={editing.cadence}
                    onValueChange={(v) => setEditing({ ...editing, cadence: v as Quest["cadence"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("quests.daily")}</SelectItem>
                      <SelectItem value="epic">{t("quests.epic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("admin.questTableStatus")}</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing({ ...editing, status: v as Quest["status"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("admin.statusDraft")}</SelectItem>
                      <SelectItem value="published">{t("admin.statusPublished")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("quests.difficulty")}</Label>
                  <Select
                    value={editing.difficulty}
                    onValueChange={(v) => setEditing({ ...editing, difficulty: v as Quest["difficulty"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{t("quests.difficultyEasy")}</SelectItem>
                      <SelectItem value="medium">{t("quests.difficultyMedium")}</SelectItem>
                      <SelectItem value="hard">{t("quests.difficultyHard")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("admin.requireFileLabel")}</Label>
                  <Select
                    value={editing.requireFile ? "yes" : "no"}
                    onValueChange={(v) => setEditing({ ...editing, requireFile: v === "yes" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">{t("common.no")}</SelectItem>
                      <SelectItem value="yes">{t("common.yes")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("admin.requireFileHint")}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("admin.questTableVisibility")}</Label>
                {fixedDepartmentId !== undefined ? (
                  <p className="rounded-md border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                    {t2(departments.find((d) => d.id === fixedDepartmentId)?.name ?? { en: "—", ar: "—" })}
                  </p>
                ) : (
                  <Select
                    value={editing.departmentId}
                    onValueChange={(v) => setEditing({ ...editing, departmentId: v, assigneeId: EVERYONE })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE}>{t("admin.visibilityAll")}</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {t2(d.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t("admin.assignToLabel")}</Label>
                <Select
                  value={editing.assigneeId}
                  onValueChange={(v) => setEditing({ ...editing, assigneeId: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EVERYONE}>{t("admin.assignEveryoneOption")}</SelectItem>
                    {(fixedDepartmentId ?? (editing.departmentId === UNIVERSITY_WIDE ? undefined : editing.departmentId))
                      ? teamFor((fixedDepartmentId ?? editing.departmentId) as string).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {t2(u.name)}
                          </SelectItem>
                        ))
                      : users
                          .filter((u) => u.role === "employee")
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {t2(u.name)}
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} disabled={createQuest.isPending || updateQuest.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate an expired quest */}
      <Dialog open={!!reactivating} onOpenChange={(o) => !o && setReactivating(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.reactivate")}</DialogTitle>
          </DialogHeader>
          {reactivating && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("admin.reactivateHint", { name: t2(reactivating.quest.title) })}
              </p>
              <div className="space-y-1.5">
                <Label>{t("admin.newDeadlineLabel")}</Label>
                <Input
                  type="date"
                  value={reactivating.dueDate}
                  min={toDateInput(new Date())}
                  onChange={(e) => setReactivating({ ...reactivating, dueDate: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivating(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmReactivate} disabled={updateQuest.isPending}>
              {t("admin.reactivate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.deleteQuest")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting && t("admin.deleteConfirm", { name: t2(deleting.title) })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteQuest.isPending}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
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
import { useDemoData } from "@/store/DemoDataContext";
import { departmentById, departmentTeam, manageableQuests } from "@/store/selectors";
import { formatNumber } from "@/lib/utils";
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL_KEY } from "@/lib/questDisplay";
import type { Quest } from "@/data";

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
  };
}

export function QuestManager({
  fixedDepartmentId,
  createdBy,
}: {
  /** Locks quest CRUD to one department (Manager use). Omit for Admin's full picker. */
  fixedDepartmentId?: string;
  createdBy: string;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { state, createQuest, updateQuest, deleteQuest } = useDemoData();

  const rows = fixedDepartmentId !== undefined ? manageableQuests(state, fixedDepartmentId) : state.quests;

  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Quest | null>(null);

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
    });

  const save = () => {
    if (!editing || !editing.titleEn.trim()) return;
    const departmentId = editing.departmentId === UNIVERSITY_WIDE ? null : editing.departmentId;
    const assigneeId = editing.assigneeId === EVERYONE ? undefined : editing.assigneeId;

    if (editing.id) {
      updateQuest(editing.id, {
        title: { en: editing.titleEn, ar: editing.titleEn },
        description: { en: editing.descriptionEn, ar: editing.descriptionEn },
        cadence: editing.cadence,
        category: { en: editing.categoryEn, ar: editing.categoryEn },
        difficulty: editing.difficulty,
        xp: editing.xp,
        departmentId,
        assigneeId,
        status: editing.status,
        requireFile: editing.requireFile,
      });
    } else {
      createQuest({
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
        createdBy,
      });
    }
    toast.success(editing.id ? t("common.saveChanges") : t("admin.newQuest"));
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteQuest(deleting.id);
    toast.success(t("admin.deleteQuest"), { description: t2(deleting.title) });
    setDeleting(null);
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
                const dept = departmentById(state, q.departmentId);
                const assignee = q.assigneeId ? state.users.find((u) => u.id === q.assigneeId) : undefined;
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
                      <Badge variant={q.status === "published" ? "success" : "muted"}>
                        {q.status === "published" ? t("admin.statusPublished") : t("admin.statusDraft")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
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
        <DialogContent>
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
                    {t2(departmentById(state, fixedDepartmentId)?.name ?? { en: "—", ar: "—" })}
                  </p>
                ) : (
                  <Select
                    value={editing.departmentId}
                    onValueChange={(v) => setEditing({ ...editing, departmentId: v, assigneeId: EVERYONE })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE}>{t("admin.visibilityAll")}</SelectItem>
                      {state.departments.map((d) => (
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
                      ? departmentTeam(
                          state,
                          (fixedDepartmentId ?? editing.departmentId) as string,
                          { excludeManager: true },
                        ).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {t2(u.name)}
                          </SelectItem>
                        ))
                      : state.users
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
            <Button onClick={save}>{t("common.save")}</Button>
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
            <Button variant="destructive" onClick={confirmDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

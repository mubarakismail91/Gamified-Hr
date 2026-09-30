import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Award, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
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
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import type { Role, StaffMember } from "@/data";

type UserDraft = {
  id?: string;
  nameEn: string;
  email: string;
  titleEn: string;
  /** null = university-wide (Admin only). */
  departmentId: string | null;
  role: Role;
  startingXp: number;
};

function emptyDraft(firstDeptId: string): UserDraft {
  return { nameEn: "", email: "", titleEn: "", departmentId: firstDeptId, role: "employee", startingXp: 0 };
}

type AwardDraft = { userId: string; kind: "xp" | "badge"; amount: number; badgeId: string; reason: string };

const ALL_DEPARTMENTS = "__all__";
const UNIVERSITY_WIDE = "__university_wide__";

export function UserManager() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { user: actingUser } = useSession();
  const { state, addUser, updateUser, deleteUser, awardXp, awardBadge } = useDemoData();

  const [editing, setEditing] = useState<UserDraft | null>(null);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [awarding, setAwarding] = useState<AwardDraft | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>(ALL_DEPARTMENTS);

  const firstDeptId = state.departments[0]?.id ?? "";
  const visibleUsers =
    deptFilter === ALL_DEPARTMENTS ? state.users : state.users.filter((u) => u.departmentId === deptFilter);

  const openNew = () => setEditing(emptyDraft(firstDeptId));
  const openEdit = (u: StaffMember) =>
    setEditing({
      id: u.id,
      nameEn: u.name.en,
      email: u.email,
      titleEn: u.title.en,
      departmentId: u.departmentId,
      role: u.role,
      startingXp: u.totalXp,
    });

  const save = () => {
    if (!editing || !editing.nameEn.trim() || !editing.email.trim()) return;
    if (editing.id) {
      updateUser(editing.id, {
        name: { en: editing.nameEn, ar: editing.nameEn },
        email: editing.email,
        title: { en: editing.titleEn, ar: editing.titleEn },
        departmentId: editing.departmentId,
        role: editing.role,
      });
    } else {
      addUser({
        nameEn: editing.nameEn,
        email: editing.email,
        titleEn: editing.titleEn,
        departmentId: editing.departmentId,
        role: editing.role,
        startingXp: editing.startingXp,
      });
    }
    toast.success(editing.id ? t("common.saveChanges") : t("admin.newUser"));
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteUser(deleting.id);
    toast.success(t("admin.deleteUser"), { description: t2(deleting.name) });
    setDeleting(null);
  };

  const openAward = (u: StaffMember) =>
    setAwarding({ userId: u.id, kind: "xp", amount: 25, badgeId: state.badges[0]?.id ?? "", reason: "" });

  const submitAward = () => {
    if (!awarding) return;
    const target = state.users.find((u) => u.id === awarding.userId);
    if (!target) return;
    if (awarding.kind === "xp") {
      awardXp(awarding.userId, awarding.amount, awarding.reason, actingUser.id);
      toast.success(t("admin.awardToastXp", { n: awarding.amount }), { description: t2(target.name) });
    } else {
      const badge = state.badges.find((b) => b.id === awarding.badgeId);
      awardBadge(awarding.userId, awarding.badgeId, actingUser.id);
      toast.success(t("admin.awardToastBadge"), { description: badge ? t2(badge.name) : undefined });
    }
    setAwarding(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">{t("admin.filterDept")}</span>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>{t("admin.filterAllDepartments")}</SelectItem>
              {state.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {t2(d.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.newUser")}
        </Button>
      </div>

      {visibleUsers.length === 0 ? (
        <EmptyState icon={Users} title={t("admin.noUsers")} />
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.usersTableName")}</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>{t("common.department")}</TableHead>
              <TableHead className="text-end">{t("admin.questTableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar person={u} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t2(u.name)}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "gold" : u.role === "manager" ? "default" : "secondary"}>
                    {t(`roles.${u.role}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t2(u.department)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openAward(u)} aria-label={t("admin.awardTitle")}>
                      <Award className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label={t("common.edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(u)}
                      aria-label={t("common.delete")}
                      disabled={u.id === actingUser.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.editUser") : t("admin.newUser")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("admin.usersTableName")}</Label>
                  <Input value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("profile.contact")}</Label>
                  <Input
                    type="email"
                    value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("profile.title")}</Label>
                <Input value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("common.department")}</Label>
                  <Select
                    value={editing.departmentId ?? UNIVERSITY_WIDE}
                    onValueChange={(v) =>
                      setEditing({ ...editing, departmentId: v === UNIVERSITY_WIDE ? null : v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {editing.role === "admin" && (
                        <SelectItem value={UNIVERSITY_WIDE}>{t("admin.universityWideOption")}</SelectItem>
                      )}
                      {state.departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {t2(d.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.role")}</Label>
                  <Select
                    value={editing.role}
                    onValueChange={(v) =>
                      setEditing({
                        ...editing,
                        role: v as Role,
                        // Only Admin may have no department — moving away from Admin needs a real one.
                        departmentId: v !== "admin" && editing.departmentId === null ? firstDeptId : editing.departmentId,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t("roles.employee")}</SelectItem>
                      <SelectItem value="manager">{t("roles.manager")}</SelectItem>
                      <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!editing.id && (
                <div className="space-y-1.5">
                  <Label>{t("profile.lifetimeXp")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={editing.startingXp}
                    onChange={(e) => setEditing({ ...editing, startingXp: Number(e.target.value) || 0 })}
                  />
                </div>
              )}
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
            <DialogTitle>{t("admin.deleteUser")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting && t("admin.deleteUserConfirm", { name: t2(deleting.name) })}
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

      {/* Award XP / badge */}
      <Dialog open={!!awarding} onOpenChange={(o) => !o && setAwarding(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
              {t("admin.awardTitle")}
            </DialogTitle>
          </DialogHeader>
          {awarding && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("admin.awardTypeLabel")}</Label>
                <Select value={awarding.kind} onValueChange={(v) => setAwarding({ ...awarding, kind: v as "xp" | "badge" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp">{t("admin.awardTypeXp")}</SelectItem>
                    <SelectItem value="badge">{t("admin.awardTypeBadge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {awarding.kind === "xp" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("common.xp")}</Label>
                    <Input
                      type="number"
                      step={5}
                      value={awarding.amount}
                      onChange={(e) => setAwarding({ ...awarding, amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("admin.awardReasonLabel")}</Label>
                    <Input
                      value={awarding.reason}
                      onChange={(e) => setAwarding({ ...awarding, reason: e.target.value })}
                      placeholder={t("admin.awardReasonPlaceholder")}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label>{t("nav.badges")}</Label>
                  <Select value={awarding.badgeId} onValueChange={(v) => setAwarding({ ...awarding, badgeId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.badges.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {t2(b.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwarding(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitAward}>{t("admin.awardSubmit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

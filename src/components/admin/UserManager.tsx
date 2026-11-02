import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Award, Copy, KeyRound, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import { useSession } from "@/context/SessionContext";
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useAwardXpMutation,
  useResetPasswordMutation,
} from "@/queries/useUsers";
import { useDepartmentsQuery } from "@/queries/useDepartments";
import { useBadgesQuery, useAwardBadgeMutation } from "@/queries/useBadges";
import { useLocale } from "@/hooks/useLocale";
import type { Role, StaffMember } from "@/data";

type AwardType = "xp" | "badge";

type UserDraft = {
  id?: string;
  nameEn: string;
  email: string;
  titleEn: string;
  /** null = university-wide (Admin only). */
  departmentId: string | null;
  role: Role;
  /** Empty until chosen — a new user must have one picked, so the demographics chart never counts a silent default. */
  gender: "male" | "female" | "";
  startingXp: number;
};

function emptyDraft(firstDeptId: string): UserDraft {
  return { nameEn: "", email: "", titleEn: "", departmentId: firstDeptId, role: "employee", gender: "", startingXp: 0 };
}

const ALL_DEPARTMENTS = "__all__";
const UNIVERSITY_WIDE = "__university_wide__";

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && typeof err.response?.data?.message === "string") return err.response.data.message;
  return fallback;
}

export function UserManager() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { user: actingUser } = useSession();

  const [deptFilter, setDeptFilter] = useState<string>(ALL_DEPARTMENTS);
  const departmentsQuery = useDepartmentsQuery();
  const usersQuery = useUsersQuery(deptFilter === ALL_DEPARTMENTS ? undefined : deptFilter);
  const badgesQuery = useBadgesQuery();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const deactivateUser = useDeactivateUserMutation();
  const awardXp = useAwardXpMutation();
  const awardBadge = useAwardBadgeMutation();
  const resetPassword = useResetPasswordMutation();

  const departments = departmentsQuery.data ?? [];
  const visibleUsers = usersQuery.data ?? [];
  // Everything else is earned automatically — the backend rejects manual grants of those.
  const badgeCatalog = (badgesQuery.data ?? []).filter((b) => b.manual);

  const [editing, setEditing] = useState<UserDraft | null>(null);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [resettingPw, setResettingPw] = useState<StaffMember | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{
    email: string;
    password: string;
    name: string;
    mode: "created" | "reset";
  } | null>(null);

  const [awarding, setAwarding] = useState<StaffMember | null>(null);
  const [awardType, setAwardType] = useState<AwardType>("xp");
  const [awardAmount, setAwardAmount] = useState(10);
  const [awardReason, setAwardReason] = useState("");
  const [awardBadgeId, setAwardBadgeId] = useState("");

  const openAward = (u: StaffMember) => {
    setAwarding(u);
    setAwardType("xp");
    setAwardAmount(10);
    setAwardReason("");
    setAwardBadgeId(badgeCatalog[0]?.id ?? "");
  };

  const submitAward = async () => {
    if (!awarding) return;
    try {
      if (awardType === "xp") {
        await awardXp.mutateAsync({ id: awarding.id, amount: awardAmount, reason: awardReason.trim() || undefined });
        toast.success(t("admin.awardToastXp", { n: awardAmount }));
      } else {
        if (!awardBadgeId) return;
        await awardBadge.mutateAsync({ userId: awarding.id, badgeId: awardBadgeId });
        toast.success(t("admin.awardToastBadge"));
      }
      setAwarding(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.awardTitle")));
    }
  };

  const firstDeptId = departments[0]?.id ?? "";

  const openNew = () => setEditing(emptyDraft(firstDeptId));
  const openEdit = (u: StaffMember) =>
    setEditing({
      id: u.id,
      nameEn: u.name.en,
      email: u.email,
      titleEn: u.title.en,
      departmentId: u.departmentId,
      role: u.role,
      gender: u.gender,
      startingXp: u.totalXp,
    });

  const save = async () => {
    if (!editing || !editing.nameEn.trim() || !editing.email.trim()) return;
    if (!editing.gender) {
      toast.error(t("admin.genderRequired"));
      return;
    }
    try {
      if (editing.id) {
        await updateUser.mutateAsync({
          id: editing.id,
          patch: {
            nameEn: editing.nameEn,
            email: editing.email,
            titleEn: editing.titleEn,
            departmentId: editing.departmentId,
            role: editing.role,
            gender: editing.gender,
          },
        });
        toast.success(t("common.saveChanges"));
      } else {
        const result = await createUser.mutateAsync({
          nameEn: editing.nameEn,
          email: editing.email,
          titleEn: editing.titleEn,
          departmentId: editing.departmentId,
          role: editing.role,
          gender: editing.gender,
          startingXp: editing.startingXp,
        });
        setCreatedCreds({
          email: result.user.email,
          password: result.temporaryPassword,
          name: editing.nameEn,
          mode: "created",
        });
      }
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.newUser")));
    }
  };

  const confirmDeactivate = async () => {
    if (!deleting) return;
    try {
      await deactivateUser.mutateAsync(deleting.id);
      toast.success(t("admin.deactivateToast"), { description: t2(deleting.name) });
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.deactivateUserTitle")));
    }
  };

  const confirmResetPassword = async () => {
    if (!resettingPw) return;
    try {
      const result = await resetPassword.mutateAsync(resettingPw.id);
      toast.success(t("admin.resetPasswordToast", { name: t2(resettingPw.name) }));
      setCreatedCreds({
        email: result.user.email,
        password: result.temporaryPassword,
        name: t2(resettingPw.name),
        mode: "reset",
      });
      setResettingPw(null);
    } catch (err) {
      toast.error(errorMessage(err, t("admin.resetPasswordAction")));
    }
  };

  const copyPassword = () => {
    if (!createdCreds) return;
    navigator.clipboard
      .writeText(createdCreds.password)
      .then(() => toast.success(t("admin.tempPasswordCopied")))
      .catch(() => toast.error(t("admin.copyFailed")));
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
              {departments.map((d) => (
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

      {usersQuery.isLoading ? (
        <EmptyState icon={Users} title={t("common.loading")} />
      ) : visibleUsers.length === 0 ? (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openAward(u)}
                      aria-label={t("admin.awardTitle")}
                    >
                      <Award className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label={t("common.edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResettingPw(u)}
                      aria-label={t("admin.resetPasswordAction")}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(u)}
                      aria-label={t("admin.deactivateAction")}
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
                      {departments.map((d) => (
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
              <div className="space-y-1.5">
                <Label>{t("admin.genderLabel")}</Label>
                <Select
                  value={editing.gender}
                  onValueChange={(v) => setEditing({ ...editing, gender: v as UserDraft["gender"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.genderPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("admin.genderMale")}</SelectItem>
                    <SelectItem value="female">{t("admin.genderFemale")}</SelectItem>
                  </SelectContent>
                </Select>
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
            <Button onClick={save} disabled={createUser.isPending || updateUser.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.deactivateUserTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting && t("admin.deactivateUserConfirm", { name: t2(deleting.name) })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDeactivate} disabled={deactivateUser.isPending}>
              {t("admin.deactivateAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password confirm */}
      <Dialog open={!!resettingPw} onOpenChange={(o) => !o && setResettingPw(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.resetPasswordConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {resettingPw && t("admin.resetPasswordConfirmBody", { name: t2(resettingPw.name) })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResettingPw(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmResetPassword} disabled={resetPassword.isPending}>
              {t("admin.resetPasswordAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time temporary password display — shown after both account creation and a password reset */}
      <Dialog open={!!createdCreds} onOpenChange={(o) => !o && setCreatedCreds(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdCreds?.mode === "reset" ? t("admin.resetPasswordResultTitle") : t("admin.tempPasswordTitle")}
            </DialogTitle>
          </DialogHeader>
          {createdCreds && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {createdCreds.mode === "reset"
                  ? t("admin.resetPasswordResultBody", { name: createdCreds.name })
                  : t("admin.tempPasswordBody", { name: createdCreds.name })}
              </p>
              <div className="space-y-1.5">
                <Label>{t("profile.contact")}</Label>
                <Input readOnly value={createdCreds.email} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("landing.passwordLabel")}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={createdCreds.password} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label={t("admin.copyPassword")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award XP or a badge */}
      <Dialog open={!!awarding} onOpenChange={(o) => !o && setAwarding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.awardTitle")}</DialogTitle>
          </DialogHeader>
          {awarding && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-md bg-secondary/60 p-2.5">
                <PersonAvatar person={awarding} size="sm" />
                <p className="truncate text-sm font-medium">{t2(awarding.name)}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{t("admin.awardTypeLabel")}</Label>
                <Select value={awardType} onValueChange={(v) => setAwardType(v as AwardType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp">{t("admin.awardTypeXp")}</SelectItem>
                    <SelectItem value="badge">{t("admin.awardTypeBadge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {awardType === "xp" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("admin.awardTypeXp")}</Label>
                    <Input
                      type="number"
                      step={10}
                      value={awardAmount}
                      onChange={(e) => setAwardAmount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("admin.awardReasonLabel")}</Label>
                    <Textarea
                      value={awardReason}
                      onChange={(e) => setAwardReason(e.target.value)}
                      placeholder={t("admin.awardReasonPlaceholder")}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label>{t("admin.awardTypeBadge")}</Label>
                  <Select value={awardBadgeId} onValueChange={setAwardBadgeId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {badgeCatalog.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="flex items-center gap-2">
                            <BadgeIcon name={b.icon} className="h-3.5 w-3.5" />
                            {t2(b.name)}
                          </span>
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
            <Button
              onClick={submitAward}
              disabled={
                awardXp.isPending || awardBadge.isPending || (awardType === "badge" && !awardBadgeId)
              }
            >
              {t("admin.awardSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/common/EmptyState";
import { useDemoData } from "@/store/DemoDataContext";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import type { Department } from "@/data";

const NO_MANAGER = "__none__";

type Draft = { id?: string; nameEn: string; managerId: string };

export function DepartmentManager() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { state, addDepartment, updateDepartment, deleteDepartment } = useDemoData();

  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const openNew = () => setEditing({ nameEn: "", managerId: NO_MANAGER });
  const openEdit = (d: Department) => setEditing({ id: d.id, nameEn: d.name.en, managerId: d.managerId ?? NO_MANAGER });

  // Any non-admin can be assigned as manager — promoting them is handled automatically.
  const eligibleManagers = () => state.users.filter((u) => u.role !== "admin");

  const save = () => {
    if (!editing || !editing.nameEn.trim()) return;
    const managerId = editing.managerId === NO_MANAGER ? null : editing.managerId;
    if (editing.id) {
      updateDepartment(editing.id, { name: { en: editing.nameEn, ar: editing.nameEn }, managerId });
    } else {
      addDepartment({ nameEn: editing.nameEn, managerId });
    }
    toast.success(editing.id ? t("common.saveChanges") : t("admin.newDepartment"));
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const ok = deleteDepartment(deleting.id);
    if (ok) {
      toast.success(t("admin.deleteDepartment"), { description: t2(deleting.name) });
      setDeleting(null);
    } else {
      toast.error(t("admin.deleteDeptBlocked"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.newDepartment")}
        </Button>
      </div>

      {state.departments.length === 0 ? (
        <EmptyState icon={Building2} title={t("admin.noDepartments")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.deptTableName")}</TableHead>
                <TableHead>{t("admin.deptTableManager")}</TableHead>
                <TableHead>{t("admin.deptTableEmployees")}</TableHead>
                <TableHead className="text-end">{t("admin.questTableActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.departments.map((d) => {
                const manager = state.users.find((u) => u.id === d.managerId);
                const count = state.users.filter((u) => u.departmentId === d.id).length;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{t2(d.name)}</TableCell>
                    <TableCell>
                      {manager ? (
                        t2(manager.name)
                      ) : (
                        <Badge variant="muted">{t("admin.deptNoManager")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatNumber(count, lang)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)} aria-label={t("common.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(d)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("admin.editDepartment") : t("admin.newDepartment")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("admin.deptTableName")}</Label>
                <Input value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.deptTableManager")}</Label>
                <Select value={editing.managerId} onValueChange={(v) => setEditing({ ...editing, managerId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MANAGER}>{t("admin.deptNoManager")}</SelectItem>
                    {eligibleManagers().map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {t2(u.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("admin.deptManagerHint")}</p>
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
            <DialogTitle>{t("admin.deleteDepartment")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting && t("admin.deleteDeptConfirm", { name: t2(deleting.name) })}
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

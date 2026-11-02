import { PrismaService } from '../../prisma/prisma.service';

/**
 * Ported from the frontend demo's `syncManagerRoles()` in DemoDataContext.tsx:
 * a user's `role` is never independently "manager" — it's *derived* from
 * whether any Department currently has them as its `managerId`. Admins are
 * never touched. Call this after every mutation that could change either
 * side of that relationship (department create/update/delete, or a user
 * update) — same as the demo did on every single state change.
 *
 * Not wrapped in a DB transaction with its caller (acceptable at this
 * system's scale) — see the schema review notes on pragmatic trade-offs.
 */
export async function syncManagerRoles(prisma: PrismaService): Promise<void> {
  const departments = await prisma.department.findMany({ select: { managerId: true } });
  const managerIds = new Set(departments.map((d) => d.managerId).filter((id): id is string => !!id));

  const candidates = await prisma.user.findMany({
    where: { role: { not: 'admin' } },
    select: { id: true, role: true },
  });

  const toManager = candidates.filter((u) => managerIds.has(u.id) && u.role !== 'manager').map((u) => u.id);
  const toEmployee = candidates.filter((u) => !managerIds.has(u.id) && u.role === 'manager').map((u) => u.id);

  if (toManager.length) {
    await prisma.user.updateMany({ where: { id: { in: toManager } }, data: { role: 'manager' } });
  }
  if (toEmployee.length) {
    await prisma.user.updateMany({ where: { id: { in: toEmployee } }, data: { role: 'employee' } });
  }
}

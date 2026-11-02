import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

/**
 * Records one row every mutating action, mirroring the demo's makeAudit()
 * calls — but structured (actorId/action/targetType/targetId) instead of
 * the demo's pre-built bilingual sentences, so the Admin's Audit trail view
 * can translate `action` through i18n like every other page does (Phase F).
 */
export async function logAudit(
  prisma: PrismaService,
  entry: { actorId: string; action: string; targetType: string; targetId?: string; metadata?: Prisma.InputJsonValue },
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
    },
  });
}

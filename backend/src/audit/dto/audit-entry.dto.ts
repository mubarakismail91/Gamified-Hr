import type { Bi } from '../../common/dto/staff-member.dto';

/** Mirrors the frontend's AuditEntry (src/data/types.ts). */
export interface AuditEntryDto {
  id: string;
  at: Date;
  actor: Bi;
  action: Bi;
  target: Bi;
}

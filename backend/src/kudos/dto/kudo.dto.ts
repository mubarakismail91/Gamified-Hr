import type { Bi, StaffMemberDto } from '../../common/dto/staff-member.dto';

/** Mirrors the frontend's Kudo (src/data/types.ts), with the sender/recipient embedded as full StaffMemberDtos so the feed needs no extra lookups. */
export interface KudoDto {
  id: string;
  fromId: string;
  toId: string;
  value: 'collaboration' | 'excellence' | 'initiative' | 'mentorship' | 'service' | 'integrity';
  message: Bi;
  at: Date;
  fromStaff: StaffMemberDto;
  toStaff: StaffMemberDto;
}

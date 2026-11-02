import { BadRequestException } from '@nestjs/common';

/** A quest expires the moment its deadline passes; a manager reactivates it by moving or clearing the deadline. */
export function isExpired(quest: { dueAt: Date | null }, now = new Date()): boolean {
  return quest.dueAt !== null && quest.dueAt <= now;
}

export function assertNotExpired(quest: { dueAt: Date | null }): void {
  if (isExpired(quest)) throw new BadRequestException('This quest has expired.');
}

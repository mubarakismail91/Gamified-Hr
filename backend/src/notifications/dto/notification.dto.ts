import type { Bi } from '../../common/dto/staff-member.dto';

/** Mirrors the frontend's AppNotification (src/data/types.ts). */
export interface NotificationDto {
  id: string;
  userId: string;
  kind: 'xp' | 'badge' | 'social' | 'quest' | 'system';
  title: Bi;
  body: Bi;
  at: Date;
  read: boolean;
}

export interface MyNotificationsDto {
  items: NotificationDto[];
  unreadCount: number;
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MyNotificationsDto, NotificationDto } from './dto/notification.dto';

function toDto(n: {
  id: string;
  userId: string;
  kind: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  createdAt: Date;
  isRead: boolean;
}): NotificationDto {
  return {
    id: n.id,
    userId: n.userId,
    kind: n.kind as NotificationDto['kind'],
    title: { en: n.titleEn, ar: n.titleAr },
    body: { en: n.bodyEn, ar: n.bodyAr },
    at: n.createdAt,
    read: n.isRead,
  };
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findMine(userId: string): Promise<MyNotificationsDto> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: notifications.map(toDto),
      unreadCount: notifications.filter((n) => !n.isRead).length,
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification not found.');
    if (existing.userId !== userId) throw new ForbiddenException("This isn't your notification.");
    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}

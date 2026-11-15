import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { RealtimeGateway } from './realtime.gateway';

export const NOTIFICATION_CHANNEL = 'notification_created';
const RECONNECT_DELAY_MS = 2000;

/**
 * Holds one dedicated Postgres connection that LISTENs on 'notification_created'. A database
 * trigger (migration notify_on_notification_insert) sends on that channel after every committed
 * Notification insert, wherever in the code it happened. Each message is forwarded to the
 * recipient's browser through the gateway. If the connection drops, it reconnects.
 */
@Injectable()
export class NotificationListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationListener.name);
  private client: Client | null = null;
  private stopped = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: ConfigService,
    private gateway: RealtimeGateway,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.client?.end().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: this.config.getOrThrow<string>('DATABASE_URL') });
    client.on('notification', (msg) => this.forward(msg.payload));
    client.on('error', (err) => {
      this.logger.warn(`Notification listener connection error: ${err.message}`);
      this.scheduleReconnect();
    });
    client.on('end', () => this.scheduleReconnect());
    try {
      await client.connect();
      await client.query(`LISTEN ${NOTIFICATION_CHANNEL}`);
      this.client = client;
    } catch (err) {
      this.logger.warn(`Could not start the notification listener: ${(err as Error).message}`);
      await client.end().catch(() => undefined);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.client = null;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private forward(payload: string | undefined) {
    if (!payload) return;
    try {
      const { userId, id, createdAt } = JSON.parse(payload) as { userId: string; id: string; createdAt: string };
      this.gateway.sendNotification(userId, { id, createdAt });
    } catch {
      this.logger.warn('Ignored a malformed notification_created payload.');
    }
  }
}

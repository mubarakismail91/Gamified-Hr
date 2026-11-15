import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

/** What the browser receives when a notification is created for it. */
export interface NotificationEvent {
  id: string;
  /** When the row was inserted (database clock), used to measure delivery latency. */
  createdAt: string;
}

const userRoom = (userId: string) => `user:${userId}`;

/**
 * The live channel. Each browser connects with the same short-lived access token it uses for
 * the REST API (in the Socket.IO handshake `auth.token`). The connection joins a private room
 * for that user, so events only ever reach their owner. When the token expires, the server
 * closes the connection and the browser reconnects with a fresh token.
 */
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    // Middleware runs before a connection is accepted: no valid token, no connection.
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (typeof token !== 'string' || !token) throw new Error('missing token');
        const payload = await this.jwt.verifyAsync<{ sub: string; exp: number }>(token, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
        if (!user?.isActive) throw new Error('inactive');
        socket.data.userId = payload.sub;
        socket.data.tokenExp = payload.exp;
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
  }

  handleConnection(socket: Socket) {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));

    // Don't let a connection outlive the token it was opened with.
    const msLeft = (socket.data.tokenExp as number) * 1000 - Date.now();
    const timer = setTimeout(() => socket.disconnect(true), Math.max(0, msLeft));
    socket.on('disconnect', () => clearTimeout(timer));
  }

  sendNotification(userId: string, event: NotificationEvent) {
    this.server.to(userRoom(userId)).emit('notification', event);
  }

  /** For tests and diagnostics. */
  connectedSockets(): number {
    return this.server?.sockets.sockets.size ?? 0;
  }
}

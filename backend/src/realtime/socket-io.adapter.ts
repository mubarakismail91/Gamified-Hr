import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO on the same HTTP server and port as the REST API. CORS is applied here, at runtime,
 * because @WebSocketGateway() options are read before ConfigModule has loaded .env.
 */
export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
    });
  }
}

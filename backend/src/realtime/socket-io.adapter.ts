import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { allowedOrigins } from '../config/env.validation';

/**
 * Socket.IO on the same HTTP server and port as the REST API. CORS is applied here, at runtime,
 * because @WebSocketGateway() options are read before ConfigModule has loaded .env.
 */
export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: allowedOrigins(), credentials: true },
    });
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { NotificationListener } from './notification-listener.service';

@Module({
  imports: [JwtModule.register({})], // secret is passed per call (same JWT_ACCESS_SECRET as the REST API)
  providers: [RealtimeGateway, NotificationListener],
})
export class RealtimeModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { QuestsModule } from './quests/quests.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { BadgesModule } from './badges/badges.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { KudosModule } from './kudos/kudos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SkillsModule } from './skills/skills.module';
import { ActivityModule } from './activity/activity.module';
import { SurveysModule } from './surveys/surveys.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // isGlobal: every module can inject ConfigService without re-importing this.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    QuestsModule,
    AssignmentsModule,
    SubmissionsModule,
    BadgesModule,
    LeaderboardModule,
    KudosModule,
    NotificationsModule,
    AuditModule,
    AnalyticsModule,
    SkillsModule,
    ActivityModule,
    SurveysModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: JwtAuthGuard runs first (attaches req.user or rejects),
    // then RolesGuard can read req.user.role. Both are global — every future
    // controller is auth-protected and role-checkable with zero extra wiring,
    // opting out per-route only via @Public()/@Roles().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

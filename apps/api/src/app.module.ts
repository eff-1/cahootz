import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { PrismaService } from './prisma/prisma.service';

// Domain Modules (Modular Monolith)
import { IdentityModule } from './modules/identity/identity.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { StudentsModule } from './modules/students/students.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { StudySessionsModule } from './modules/study-sessions/study-sessions.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AdministrationModule } from './modules/administration/administration.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ConsentPrivacyModule } from './modules/consent-privacy/consent-privacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    IdentityModule,
    InstitutionsModule,
    StudentsModule,
    DiscoveryModule,
    StudySessionsModule,
    CommunitiesModule,
    MessagingModule,
    NotificationsModule,
    WalletModule,
    ModerationModule,
    AdministrationModule,
    AnalyticsModule,
    ConsentPrivacyModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RateLimitMiddleware, IdempotencyMiddleware)
      .forRoutes('*');
  }
}

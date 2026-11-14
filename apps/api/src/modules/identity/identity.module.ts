import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev_jwt_secret_must_be_32_chars_minimum!'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRY', '15m'),
        },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, PrismaService],
  exports: [IdentityService, JwtModule],
})
export class IdentityModule {}


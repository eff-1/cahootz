import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  enableTotpSchema,
  verifyTotpSchema,
  ROLES,
} from '@cahootz/shared';
import { IdentityService, TokenPayload } from './identity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppError } from '../../common/errors/app-error';

@Controller('api/v1/auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  private extractClientMeta(req: Request) {
    return {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      deviceName: (req.headers['x-device-name'] as string) || 'Web Browser',
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown, @Req() req: Request) {
    const parse = registerSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid registration data', parse.error.format());
    }

    const result = await this.identityService.register(parse.data, this.extractClientMeta(req));
    return {
      message: 'Account created. Please check your email to verify your address.',
      data: result,
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: unknown) {
    const parse = verifyEmailSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid verification request', parse.error.format());
    }

    return this.identityService.verifyEmail(parse.data.token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parse = loginSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid login data', parse.error.format());
    }

    const result = await this.identityService.login(parse.data, this.extractClientMeta(req));

    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        message: result.message,
      };
    }

    if (result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token || (req.body && req.body.refreshToken);
    if (!token) {
      throw AppError.unauthenticated('Refresh token missing');
    }

    const result = await this.identityService.refresh(token, this.extractClientMeta(req));
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: TokenPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (user?.sessionId) {
      await this.identityService.logout(user.sessionId);
    }
    this.clearRefreshTokenCookie(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('sign-out-everywhere')
  @HttpCode(HttpStatus.OK)
  async signOutEverywhere(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.identityService.signOutEverywhere(userId);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: TokenPayload) {
    return this.identityService.listSessions(user.sub, user.sessionId);
  }

  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.identityService.revokeSession(userId, sessionId);
  }

  @Public()
  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() body: unknown) {
    const parse = requestPasswordResetSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid email address', parse.error.format());
    }

    return this.identityService.requestPasswordReset(parse.data.email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: unknown) {
    const parse = resetPasswordSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid reset data', parse.error.format());
    }

    return this.identityService.resetPassword(parse.data.token, parse.data.password);
  }

  @Post('mfa/generate')
  async generateMfaSecret(@CurrentUser('sub') userId: string) {
    return this.identityService.generateMfaSecret(userId);
  }

  @Post('mfa/enable')
  async enableMfa(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const parse = enableTotpSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid MFA data', parse.error.format());
    }

    return this.identityService.enableMfa(userId, parse.data.secret, parse.data.code);
  }

  @Post('mfa/disable')
  async disableMfa(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const parse = verifyTotpSchema.safeParse(body);
    if (!parse.success) {
      throw AppError.validationFailed('Invalid code', parse.error.format());
    }

    return this.identityService.disableMfa(userId, parse.data.code);
  }
}

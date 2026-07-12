import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Res,
  Req,
  BadRequestException,
  Inject,
  UseGuards,
  Param,
  Delete,
  Get,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/requests/login.dto';
import { SignupDto } from './dto/requests/signup.dto';
import { VerifyDto, ResendVerificationDto } from './dto/requests/verify.dto';
import { EnrollMfaDto, ActivateMfaDto, VerifyMfaLoginDto } from './dto/requests/mfa.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/requests/magic-link.dto';
import { SecureAccountDto } from './dto/requests/secure-account.dto';
import { Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorator/public.decorator';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthTransport } from './enums/auth-type.enum';
import type { Response, Request } from 'express';
import { parseDuration } from './utils/duration.util';
import { Auth } from './interfaces/models.interface';
import { AuthContextService } from './core/auth-context.resolver';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    private authContext: AuthContextService,
  ) { }

  private getTransports(): AuthTransport[] {
    const t = this.options.transport || [AuthTransport.BEARER];
    return Array.isArray(t) ? t : [t];
  }

  private getDynamicPath(req: Request) {
    return this.options.refreshTokenPath || '/auth/refresh';
  }

  private setCookies(
    res: Response,
    req: Request,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';
    const refreshPath = this.getDynamicPath(req);
    const cookies = this.authContext.get(req);
    const sameSite = this.options.cookieSameSite ?? (isProduction ? 'lax' : 'none');
    const secure = this.options.cookieSecure ?? sameSite === 'none' ? true : isProduction;

    res.cookie(cookies.refreshTokenName, refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: refreshPath,
      maxAge:
        parseDuration(
          this.options.refreshTokenExpiresIn ||
          '7d',
          7 * 24 * 60 * 60,
        ) * 1000,
    });

    res.cookie(cookies.accessTokenName, accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge:
        parseDuration(
          this.options.accessTokenExpiresIn ||
          '15m',
          15 * 60,
        ) * 1000,
    });
  }

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'User signup' })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    try {
      const namespace = this.authContext.getNamespace(req);
      const result = await this.authService.signup({ dto, uid: undefined, userAgent: req.headers['user-agent'] as string, ip: req.ip, namespace });
      const transports = this.getTransports();

      if ('accessToken' in result) {
        if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
          this.setCookies(res, req, result.accessToken, result.refreshToken);
        }
      }

      const response: any = { message: result.message || 'Signup successful', auth: result.auth };
      if (result.verificationRequired) response.verificationRequired = true;

      if ('accessToken' in result && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
        response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
      }

      return response;
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('signin')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'User login' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    try {
      const namespace = this.authContext.getNamespace(req);
      const result = await this.authService.login({ dto, userAgent: req.headers['user-agent'], ip: req.ip, namespace });
      const transports = this.getTransports();

      if ('accessToken' in result) {
        if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
          this.setCookies(res, req, result.accessToken, result.refreshToken);
        }
      }

      const response: any = { message: result.message || 'Login successful', auth: result.auth };
      if (result.verificationRequired) response.verificationRequired = true;

      if ('accessToken' in result && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
        response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
      }

      return response;
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('verify')
  @Public()
  @ApiOperation({ summary: 'Verify identity with OTP code' })
  async verify(@Body() dto: VerifyDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const namespace = this.authContext.getNamespace(req);
    const result = await this.authService.verifyCode({ uid: dto.uid, code: dto.code, userAgent: req.headers['user-agent'], ip: req.ip, namespace });
    const transports = this.getTransports();

    if (result.tokens) {
      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, result.tokens.accessToken, result.tokens.refreshToken);
      }
    }

    const response: any = { message: result.message, auth: result.auth };
    if (result.tokens && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
      response.tokens = result.tokens;
    }

    return response;
  }

  @Post('resend-verification')
  @Public()
  @ApiOperation({ summary: 'Resend verification code' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.uid);
  }

  // --- PASSWORD MANAGEMENT ---

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Forgot password - request reset code' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset password using OTP code' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Update password (must be logged in)' })
  async updatePassword(@Req() req: any, @Body() dto: UpdatePasswordDto) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || 'Unknown';
    return this.authService.updatePassword(req.user.uid, dto, userAgent, ip);
  }

  @Post('secure-account')
  @Public()
  @ApiOperation({ summary: 'Lock account and invalidate sessions (via security link)' })
  async secureAccount(@Query('uid') uid: string, @Body() dto: SecureAccountDto) {
    return this.authService.secureAccount({ ...dto, uid });
  }

  // --- MAGIC LINK ---

  @Post('magic-link')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a magic login link' })
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    return this.authService.requestMagicLink(dto);
  }

  @Get('magic-callback')
  @Public()
  @ApiOperation({ summary: 'Verify magic link and login' })
  async verifyMagicLink(
    @Query('token') token: string,
    @Query('email') email: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    const namespace = this.authContext.getNamespace(req);
    const result = await this.authService.verifyMagicLink({ dto: { token, email }, userAgent: req.headers['user-agent'], ip: req.ip, namespace });
    const transports = this.getTransports();

    if (result.tokens) {
      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, result.tokens.accessToken, result.tokens.refreshToken);
      }
    }

    const response: any = { message: 'Magic login successful', auth: result.auth };
    if (result.tokens && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
      response.tokens = result.tokens;
    }

    return response;
  }

  @Post('link')
  @ApiOperation({ summary: 'Link new auth method to current account' })
  async link(@Body() dto: SignupDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    try {
      const namespace = this.authContext.getNamespace(req);
      const result = await this.authService.signup({ dto, uid: req.user.uid, userAgent: req.headers['user-agent'] as string, ip: req.ip, namespace });
      const transports = this.getTransports();

      if ('accessToken' in result) {
        if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
          this.setCookies(res, req, result.accessToken, result.refreshToken);
        }
      }

      const response: any = { message: result.message || 'Method linked successfully', auth: result.auth };
      if (result.verificationRequired) response.verificationRequired = true;

      if ('accessToken' in result && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
        response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
      }

      return response;
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshTokenDto) {
    const transports = this.getTransports();
    const namespace = this.authContext.getNamespace(req);
    const cookies = this.authContext.get(req);

    let token =
      req.cookies?.[cookies.refreshTokenName] ||
      dto.refreshToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) throw new BadRequestException('Refresh token is required');

    try {
      const tokens = await this.authService.refreshTokens({ refreshToken: token, currentUserAgent: req.headers['user-agent'] || '', currentIp: req.ip, namespace });

      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, tokens.accessToken, tokens.refreshToken);
      }

      if (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH)) {
        return { message: 'Token refreshed', tokens };
      }

      return { message: 'Token refreshed' };
    } catch (e) {
      res.clearCookie(cookies.accessTokenName, {
        path: '/',
      });

      res.clearCookie(cookies.refreshTokenName, {
        path: this.getDynamicPath(req),
      });
      throw new HttpException('Invalid session', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('mfa/enroll')
  @ApiOperation({ summary: 'Enroll in MFA (e.g., TOTP)' })
  async enrollMfa(@Req() req: any, @Body() dto: EnrollMfaDto) {
    return this.authService.enrollMfa(req.user.uid, dto.type);
  }

  @Post('mfa/activate')
  @ApiOperation({ summary: 'Activate MFA after enrollment' })
  async activateMfa(@Req() req: any, @Body() dto: ActivateMfaDto) {
    return this.authService.activateMfa(req.user.uid, dto.type, dto.code);
  }

  @Post('mfa/verify')
  @Public()
  @ApiOperation({ summary: 'Verify MFA code to complete login' })
  async verifyMfa(@Body() dto: VerifyMfaLoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const namespace = this.authContext.getNamespace(req);
    const result = await this.authService.mfaLogin(dto.uid, dto.code, req.headers['user-agent'], req.ip, namespace);
    const transports = this.getTransports();

    if (result.tokens) {
      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, result.tokens.accessToken, result.tokens.refreshToken);
      }
    }

    const response: any = { message: result.message, auth: result.auth };
    if (result.tokens && (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH))) {
      response.tokens = result.tokens;
    }

    return response;
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshTokenDto) {
    const cookies = this.authContext.get(req);
    let token = req.cookies?.[cookies.refreshTokenName] || dto.refreshToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    await this.authService.logout(token);
    res.clearCookie(cookies.accessTokenName, { path: '/' });
    res.clearCookie(cookies.refreshTokenName, { path: this.getDynamicPath(req) });

    return { message: 'Logged out successfully' };
  }

  // @OptionalAuth()
  // @Get('')
  // async all() {
  //   return this.authService.viewAll();
  // }

  @Get('/me')
  @ApiOperation({ summary: 'View current Authentication (Auth)' })
  async me(@Req() req: any) {
    return this.authService.me(req.user.uid);
  }

  @Get('/me/methods')
  @ApiOperation({ summary: 'View all authentication methods' })
  async viewAll(@Req() req: any) {
    return this.authService.viewAllMyAuthMethods(req.user.uid);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account and all associated data' })
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.deleteAccount(req.user.uid);
    const cookies = this.authContext.get(req);
    res.clearCookie(cookies.accessTokenName, { path: '/' });
    res.clearCookie(cookies.refreshTokenName, { path: this.getDynamicPath(req) });
    return { message: 'Account deleted successfully' };
  }

  @Delete('method/:id')
  @ApiOperation({ summary: 'Delete a specific authentication method' })
  async deleteAuthMethod(@Req() req: any, @Param('id') authId: string) {
    return this.authService.deleteAuthMethod(req.user.uid, authId);
  }
}

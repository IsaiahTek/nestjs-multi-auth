import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorator/public.decorator';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AuthTransport } from './auth-type.enum';
import type { Response, Request } from 'express';
// import { CartService } from '../carts/cart.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) { }

  private getDynamicPath(req: Request) {
    const baseUrl = req.originalUrl.split('?')[0]; // Remove query params if any
    const lastSlashIndex = baseUrl.lastIndexOf('/');
    const basePath = baseUrl.substring(0, lastSlashIndex);
    const dynamicRefreshPath = `${basePath}/refresh`;
    return dynamicRefreshPath;
  }
  // Helper to set cookies consistently
  private setCookies(
    res: Response,
    req: Request,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    const dynamicRefreshPath = this.getDynamicPath(req);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: dynamicRefreshPath, // Security: Only send this cookie to the refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' needed for cross-domain/secure
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'User signup' })
  @ApiResponse({ status: 201, description: 'User created' })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      // Pass IP and User Agent for session tracking
      const userAgent = req.headers['user-agent'];
      const ip = req.ip;

      const result = await this.authService.signup(dto, userAgent, ip);

      const transports = this.options.transport || [AuthTransport.BEARER];

      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, result.accessToken, result.refreshToken);
      }

      if (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH)) {
        return { message: 'Signup successful', auth: result.auth, tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } };
      }

      return { message: 'Signup successful', auth: result.auth };
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Signup error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('signin')
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      const userAgent = req.headers['user-agent'];
      const ip = req.ip;

      const result = await this.authService.login(dto, userAgent, ip);

      const transports = this.options.transport || [AuthTransport.BEARER];

      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, result.accessToken, result.refreshToken);
      }

      if (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH)) {
        return { message: 'Login successful', auth: result.auth, tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } };
      }

      return { message: 'Login successful', auth: result.auth };
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Login error',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh tokens using cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    try {
      let refreshToken = req.cookies?.['refresh_token'] as string | undefined;

      // Fallback to Body token
      if (!refreshToken && dto.refreshToken) {
        refreshToken = dto.refreshToken;
      }

      // Fallback to Bearer token string if cookie is absent
      if (!refreshToken && req.headers.authorization?.startsWith('Bearer ')) {
        refreshToken = req.headers.authorization.split(' ')[1];
      }

      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token');
      }

      // Normalize user agent
      const userAgent =
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : 'unknown';

      // Respect reverse proxies
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';

      const tokens = await this.authService.refreshTokens(
        refreshToken,
        userAgent,
        ip,
      );

      const transports = this.options.transport || [AuthTransport.BEARER];

      if (transports.includes(AuthTransport.COOKIE) || transports.includes(AuthTransport.BOTH)) {
        this.setCookies(res, req, tokens.accessToken, tokens.refreshToken);
      }

      if (transports.includes(AuthTransport.BEARER) || transports.includes(AuthTransport.BOTH)) {
        return { message: 'Refreshed successfully', tokens };
      }

      return { message: 'Refreshed successfully' };
    } catch (e) {
      console.error('Error refreshing tokens', e);

      // Must match original cookie options
      res.clearCookie('access_token');
      res.clearCookie('refresh_token', {
        path: this.getDynamicPath(req),
      });

      throw new HttpException(
        'Invalid refresh session',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    let refreshToken = req.cookies['refresh_token'] as
      | string
      | undefined
      | null;

    if (!refreshToken && dto.refreshToken) {
      refreshToken = dto.refreshToken;
    }

    if (!refreshToken && req.headers.authorization?.startsWith('Bearer ')) {
      refreshToken = req.headers.authorization.split(' ')[1];
    }

    // Invalidate session in DB
    await this.authService.logout(refreshToken ?? '');

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: this.getDynamicPath(req) });

    return { message: 'Logged out successfully' };
  }
}

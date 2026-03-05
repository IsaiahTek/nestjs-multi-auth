import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { OtpAuthStrategy } from './strategies/otp.strategy';
import { AuthStrategy } from './auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private passwordStrategy: PasswordAuthStrategy,
    private googleStrategy: GoogleAuthStrategy,
    private otpStrategy: OtpAuthStrategy,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Auth)
    private authRepo: Repository<Auth>,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) { }

  // --- INTERNAL HELPER: Generate Token Pair ---
  private async generateTokens(uid: string, sessionId: string) {
    const refreshJti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: uid, sessionId },
        {
          secret: this.options.jwtSecret || process.env.JWT_SECRET,
          expiresIn: (this.options.jwtExpiresIn || '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: uid, sessionId, jti: refreshJti },
        {
          secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET,
          expiresIn: (this.options.jwtRefreshExpiresIn || '7d') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private fingerprint(userAgent: string) {
    return crypto.createHash('sha256').update(userAgent).digest('hex');
  }

  // --- INTERNAL HELPER: Create/Update Session in DB ---
  private async createSession(
    uid: string,
    userAgent: string = 'Unknown',
    ip: string = 'Unknown',
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const deviceFingerprint = this.fingerprint(userAgent);

    const session = this.sessionRepository.create({
      uid,
      deviceFingerprint,
      ipAddress: ip,
      expiresAt,
      refreshTokenHash: '',
      userAgent,
    });

    await this.sessionRepository.save(session);

    const tokens = await this.generateTokens(uid, session.id);

    session.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.sessionRepository.save(session);

    return tokens;
  }

  async signup(dto: SignupDto, userAgent?: string, ip?: string) {
    if (!dto.method) throw new BadRequestException('Method is required');

    let auth: Auth;
    switch (dto.method) {
      case AuthStrategy.LOCAL:
        auth = await this.passwordStrategy.registerCredentials(dto);
        break;
      case AuthStrategy.OAUTH:
        auth = await this.googleStrategy.registerCredentials(dto);
        break;
      case AuthStrategy.OTP:
        auth = await this.otpStrategy.registerCredentials(dto);
        break;
      default:
        throw new Error('Unsupported signup provider');
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    if (!dto.method) throw new BadRequestException('Method is required');

    let auth: Auth;
    switch (dto.method) {
      case AuthStrategy.LOCAL:
        auth = await this.passwordStrategy.login(dto);
        break;
      case AuthStrategy.OAUTH:
        auth = await this.googleStrategy.login(dto);
        break;
      case AuthStrategy.OTP:
        auth = await this.otpStrategy.login(dto);
        break;
      default:
        throw new Error('Unsupported login provider');
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  async refreshTokens(
    refreshToken: string,
    currentUserAgent: string,
    currentIp?: string,
  ) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sessionId: string }>(
        refreshToken,
        { secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET },
      );

      const session = await this.sessionRepository.findOne({
        where: { id: payload.sessionId },
        select: [
          'id',
          'uid',
          'refreshTokenHash',
          'expiresAt',
          'deviceFingerprint',
          'ipAddress',
        ],
      });

      if (!session) throw new ForbiddenException('Session not found');

      const incomingFingerprint = this.fingerprint(currentUserAgent);
      if (session.deviceFingerprint !== incomingFingerprint) {
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Device mismatch');
      }

      if (new Date() > session.expiresAt) {
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Session expired');
      }

      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (!isMatch) {
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(session.uid, session.id);

      const newHash = await bcrypt.hash(tokens.refreshToken, 10);

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await this.sessionRepository.update(session.id, {
        refreshTokenHash: newHash,
        expiresAt: newExpiry,
        ipAddress: currentIp ?? session.ipAddress,
      });

      return tokens;
    } catch (e) {
      this.logger.error('Error refreshing tokens', e);
      throw new ForbiddenException('Invalid request');
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.decode<{ sessionId: string }>(
        refreshToken,
      );
      if (payload?.sessionId) {
        await this.sessionRepository.delete(payload.sessionId);
      }
    } catch (e) {
      this.logger.error('Error logging out', e);
    }
  }
}

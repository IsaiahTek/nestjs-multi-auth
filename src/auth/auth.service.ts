import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { OtpAuthStrategy } from './strategies/otp.strategy';
import { AuthStrategy } from './auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken, OtpPurpose } from './entities/otp-token.entity';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER, AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @Optional() private passwordStrategy: LocalAuthStrategy,
    @Optional() private oauthStrategy: OAuthAuthStrategy,
    @Optional() private otpStrategy: OtpAuthStrategy,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Auth)
    private authRepo: Repository<Auth>,
    @InjectRepository(OtpToken)
    private otpRepo: Repository<OtpToken>,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    @Optional()
    @Inject(AUTH_NOTIFICATION_PROVIDER)
    private notificationProvider?: AuthNotificationProvider,
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

    const enabledStrategies = this.options.enabledStrategies || [
      AuthStrategy.LOCAL,
      AuthStrategy.OAUTH,
      AuthStrategy.OTP,
    ];

    if (!enabledStrategies.includes(dto.method)) {
      throw new BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
    }

    let auth: Auth;
    switch (dto.method) {
      case AuthStrategy.LOCAL:
        if (!this.passwordStrategy) throw new BadRequestException('Local authentication is not configured.');
        auth = await this.passwordStrategy.registerCredentials(dto);
        break;
      case AuthStrategy.OAUTH:
        if (!this.oauthStrategy) throw new BadRequestException('OAuth authentication is not configured.');
        auth = await this.oauthStrategy.registerCredentials(dto);
        break;
      case AuthStrategy.OTP:
        if (!this.otpStrategy) throw new BadRequestException('OTP authentication is not configured.');
        auth = await this.otpStrategy.registerCredentials(dto);
        break;
      default:
        throw new Error('Unsupported signup provider');
    }

    // Trigger verification if provider is configured
    if (this.notificationProvider) {
      await this.sendVerification(auth);
    }

    // If verification is strictly required, we don't issue session tokens yet
    if (this.options.verificationRequired && this.notificationProvider) {
      return {
        message: 'Signup successful. Please verify your identity.',
        auth,
        verificationRequired: true
      };
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    if (!dto.method) throw new BadRequestException('Method is required');

    const enabledStrategies = this.options.enabledStrategies || [
      AuthStrategy.LOCAL,
      AuthStrategy.OAUTH,
      AuthStrategy.OTP,
    ];

    if (!enabledStrategies.includes(dto.method)) {
      throw new BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
    }

    let auth: Auth;
    switch (dto.method) {
      case AuthStrategy.LOCAL:
        if (!this.passwordStrategy) throw new BadRequestException('Local authentication is not configured.');
        auth = await this.passwordStrategy.login(dto);
        break;
      case AuthStrategy.OAUTH:
        if (!this.oauthStrategy) throw new BadRequestException('OAuth authentication is not configured.');
        auth = await this.oauthStrategy.login(dto);
        break;
      case AuthStrategy.OTP:
        if (!this.otpStrategy) throw new BadRequestException('OTP authentication is not configured.');
        auth = await this.otpStrategy.login(dto);
        break;
      default:
        throw new Error('Unsupported login provider');
    }

    // Check if verification is required and auth is not verified
    if (this.options.verificationRequired && !auth.isVerified && this.notificationProvider) {
      await this.sendVerification(auth);
      return {
        message: 'Identity verification required.',
        auth,
        verificationRequired: true
      };
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  // --- VERIFICATION LOGIC ---

  private async sendVerification(auth: Auth) {
    if (!this.notificationProvider) return;

    // 1. Determine primary identifier (email or phone)
    // For now, let's look for the first identifier that is EMAIL or PHONE
    // We need to load identifiers if they aren't present
    let primaryIdentifier = auth.identifiers?.find(id => id.type === 'EMAIL' || id.type === 'PHONE');

    if (!primaryIdentifier) {
      // Fallback: reload auth with identifiers
      const fullAuth = await this.authRepo.findOne({
        where: { id: auth.id },
        relations: ['identifiers']
      });
      primaryIdentifier = fullAuth?.identifiers?.find(id => id.type === 'EMAIL' || id.type === 'PHONE');
    }

    if (!primaryIdentifier) {
      this.logger.warn(`No email or phone found for Auth UID: ${auth.uid}. Verification skipped.`);
      return;
    }

    // 2. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);

    // 3. Save OTP Token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 mins expiry

    const otpToken = this.otpRepo.create({
      identifier: primaryIdentifier.value,
      purpose: primaryIdentifier.type === 'EMAIL' ? OtpPurpose.VERIFY_EMAIL : OtpPurpose.VERIFY_PHONE,
      codeHash: hash,
      expiresAt,
      requestUserId: auth.uid,
    });

    await this.otpRepo.save(otpToken);

    // 4. Send via Provider
    try {
      await this.notificationProvider.sendVerificationCode(
        primaryIdentifier.value,
        code,
        primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone'
      );
    } catch (e) {
      this.logger.error(`Failed to send verification code to ${primaryIdentifier.value}`, e);
      throw new BadRequestException('Failed to send verification code');
    }
  }

  async verifyCode(uid: string, code: string) {
    const auth = await this.authRepo.findOne({ where: { uid } });
    if (!auth) throw new BadRequestException('Identity not found');

    if (auth.isVerified) return { message: 'Identity already verified' };

    // Find the latest unused OTP for this UID
    const otp = await this.otpRepo.findOne({
      where: { requestUserId: uid, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) throw new BadRequestException('No verification code found');

    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    const isMatch = await bcrypt.compare(code, otp.codeHash);
    if (!isMatch) throw new BadRequestException('Invalid verification code');

    // Success!
    otp.isUsed = true;
    await this.otpRepo.save(otp);

    auth.isVerified = true;
    await this.authRepo.save(auth);

    return { message: 'Identity verified successfully' };
  }

  async resendVerification(uid: string) {
    const auth = await this.authRepo.findOne({ where: { uid } });
    if (!auth) throw new BadRequestException('Identity not found');

    if (auth.isVerified) throw new BadRequestException('Identity already verified');

    if (!this.notificationProvider) {
      throw new BadRequestException('Verification is not configured');
    }

    await this.sendVerification(auth);
    return { message: 'Verification code resent' };
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

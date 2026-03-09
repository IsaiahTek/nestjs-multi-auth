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
import { AuthStrategy } from './auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken, OtpPurpose } from './entities/otp-token.entity';
import { MfaMethod, MfaType } from './entities/mfa-method.entity';
import { authenticator } from 'otplib';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER, AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
import * as crypto from 'crypto';
import { parseDuration } from './utils/duration.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @Optional() private passwordStrategy: LocalAuthStrategy,
    @Optional() private oauthStrategy: OAuthAuthStrategy,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Auth)
    private authRepo: Repository<Auth>,
    @InjectRepository(OtpToken)
    private otpRepo: Repository<OtpToken>,
    @InjectRepository(MfaMethod)
    private mfaRepo: Repository<MfaMethod>,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    @Optional()
    @Inject(AUTH_NOTIFICATION_PROVIDER)
    private notificationProvider?: AuthNotificationProvider,
  ) { }

  // --- INTERNAL HELPER: Generate Token Pair ---
  private async generateTokens(uid: string, sessionId: string) {
    const refreshJti = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: uid, sessionId },
        {
          secret: this.options.jwtSecret || process.env.JWT_SECRET,
          expiresIn: (this.options.accessTokenExpiresIn || '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: uid, sessionId, jti: refreshJti },
        {
          secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET,
          expiresIn: (this.options.refreshTokenExpiresIn || '7d') as any,
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
    const durationSeconds = parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
    expiresAt.setSeconds(expiresAt.getSeconds() + durationSeconds);

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

  async signup(dto: SignupDto, uid?: string, userAgent?: string, ip?: string) {
    if (!dto.method) throw new BadRequestException('Method is required');

    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

    if (!enabledStrategies.includes(dto.method)) {
      throw new BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
    }

    let auth: Auth;
    let identifier: any;
    switch (dto.method) {
      case AuthStrategy.EMAIL:
      case AuthStrategy.PHONE:
      case AuthStrategy.USERNAME:
      case AuthStrategy.LOCAL:
        if (!this.passwordStrategy) throw new BadRequestException('Local authentication is not configured.');
        const localResult = await this.passwordStrategy.registerCredentials(dto, uid);
        auth = localResult.auth;
        identifier = localResult.identifier;
        break;
      case AuthStrategy.GOOGLE:
      case AuthStrategy.FACEBOOK:
      case AuthStrategy.APPLE:
      case AuthStrategy.OAUTH:
        if (!this.oauthStrategy) throw new BadRequestException('OAuth authentication is not configured.');
        const oauthResult = await this.oauthStrategy.registerCredentials(dto, uid);
        auth = oauthResult.auth;
        identifier = oauthResult.identifier;
        break;
      default:
        throw new Error('Unsupported signup provider');
    }

    // Force verification if no password was provided for local strategies (passwordless signup)
    const isPasswordless = [AuthStrategy.EMAIL, AuthStrategy.PHONE, AuthStrategy.USERNAME, AuthStrategy.LOCAL].includes(dto.method as any) && !dto.password;

    // Check if user has 2FA enabled
    const mfaMethod = await this.mfaRepo.findOne({ where: { uid: auth.uid, isEnabled: true } });
    const has2FA = !!mfaMethod;

    const triggerVerification = isPasswordless ||
      (this.options.verificationRequired && !identifier?.isVerified) ||
      has2FA;

    if (triggerVerification && this.notificationProvider) {
      if (!identifier?.isVerified || has2FA || isPasswordless) {
        await this.sendVerification(auth, identifier);
      }
      return {
        message: isPasswordless ? 'Passwordless signup: Verification code sent.' : 'Signup successful. Please verify your identity.',
        auth,
        verificationRequired: true
      };
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    if (!dto.method) throw new BadRequestException('Method is required');

    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

    if (!enabledStrategies.includes(dto.method)) {
      throw new BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
    }

    let auth: Auth;
    let identifier: any;
    switch (dto.method) {
      case AuthStrategy.EMAIL:
      case AuthStrategy.PHONE:
      case AuthStrategy.USERNAME:
      case AuthStrategy.LOCAL:
        if (!this.passwordStrategy) throw new BadRequestException('Local authentication is not configured.');
        const localResult = await this.passwordStrategy.login(dto);
        auth = localResult.auth;
        identifier = localResult.identifier;
        break;
      case AuthStrategy.GOOGLE:
      case AuthStrategy.FACEBOOK:
      case AuthStrategy.APPLE:
      case AuthStrategy.OAUTH:
        if (!this.oauthStrategy) throw new BadRequestException('OAuth authentication is not configured.');
        const oauthResult = await this.oauthStrategy.login(dto);
        auth = oauthResult.auth;
        identifier = oauthResult.identifier;
        break;
      default:
        throw new Error('Unsupported login provider');
    }

    // Force verification if no password was provided for local strategies (passwordless login)
    const isPasswordless = [AuthStrategy.EMAIL, AuthStrategy.PHONE, AuthStrategy.USERNAME, AuthStrategy.LOCAL].includes(dto.method as any) && !dto.password;

    // Check if user has 2FA enabled
    const mfaMethod = await this.mfaRepo.findOne({ where: { uid: auth.uid, isEnabled: true } });
    const has2FA = !!mfaMethod;

    // Trigger email/phone verification only if required and identifier not verified.
    // MFA (2FA) is handled separately via dedicated endpoints.
    const triggerVerification = isPasswordless ||
      (this.options.verificationRequired && !identifier?.isVerified);


    if (triggerVerification && this.notificationProvider) {
      await this.sendVerification(auth, identifier);
      return {
        message: isPasswordless ? 'Passwordless login: Verification code sent.' : 'Identity verification required.',
        auth,
        verificationRequired: true,
        tokens: undefined,
      };
    }

    // If MFA is enabled, inform client that additional MFA verification is required.
    if (has2FA) {
      return {
        message: 'MFA required',
        auth,
        mfaRequired: true,
        tokens: undefined,
      };
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { ...tokens, auth };
  }

  // --- VERIFICATION LOGIC ---

  private async sendVerification(auth: Auth, currentIdentifier?: any) {
    if (!this.notificationProvider) return;

    // 1. Determine primary identifier (email or phone) to send the code to
    // If we have a verified email/phone on the same UID, use that.
    // Otherwise use the current identifier if it's verifiable.

    let primaryIdentifier = currentIdentifier?.type !== 'USERNAME' ? currentIdentifier : null;

    if (!primaryIdentifier) {
      // Look for any EMAIL or PHONE linked to this UID
      const allIdentifiers = await this.authRepo.query(
        `SELECT ai.* FROM auth_identifiers ai 
         JOIN auth a ON ai."authId" = a.id 
         WHERE a.uid = $1 AND ai.type IN ('EMAIL', 'PHONE')
         ORDER BY ai."isVerified" DESC, ai."createdAt" ASC LIMIT 1`,
        [auth.uid]
      );
      primaryIdentifier = allIdentifiers[0];
    }

    if (!primaryIdentifier) {
      // As a last resort, reload auth with identifiers and find first EMAIL/PHONE
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
    const otpExpMins = this.options.otpExpiresIn || 15;
    expiresAt.setMinutes(expiresAt.getMinutes() + otpExpMins);

    const otpToken = this.otpRepo.create({
      identifier: primaryIdentifier.value,
      purpose: primaryIdentifier.type === 'EMAIL' ? OtpPurpose.VERIFY_EMAIL : OtpPurpose.VERIFY_PHONE,
      codeHash: hash,
      expiresAt,
      requestUserId: auth.uid,
      requestAuthId: auth.id,
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

  async verifyCode(uid: string, code: string, userAgent?: string, ip?: string) {
    const auth = await this.authRepo.findOne({ where: { uid } });
    if (!auth) throw new BadRequestException('Identity not found');

    // Find the latest unused OTP for this UID
    const otp = await this.otpRepo.findOne({
      where: { requestUserId: uid, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      if (auth.isVerified) return { message: 'Identity already verified' };
      throw new BadRequestException('No verification code found');
    }

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

    // Also mark all identifiers for this Auth as verified
    await this.authRepo.query(
      `UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`,
      [auth.id]
    );

    // If there's a requestAuthId on the OTP (which there should be), update that one too if different
    if (otp.requestAuthId && otp.requestAuthId !== auth.id) {
      await this.authRepo.update(otp.requestAuthId, { isVerified: true });
      await this.authRepo.query(
        `UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`,
        [otp.requestAuthId]
      );
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip);

    return { message: 'Identity verified successfully', tokens, auth };
  }

  async resendVerification(uid: string) {
    const auth = await this.authRepo.findOne({ where: { uid } });
    if (!auth) throw new BadRequestException('Identity not found');

    if (!this.notificationProvider) {
      throw new BadRequestException('Verification is not configured');
    }

    // Check resend interval
    const latestOtp = await this.otpRepo.findOne({
      where: { requestUserId: uid },
      order: { createdAt: 'DESC' },
    });

    if (latestOtp) {
      const intervalSeconds = this.options.otpResendInterval || 60;
      const diffMs = Date.now() - latestOtp.createdAt.getTime();
      if (diffMs < intervalSeconds * 1000) {
        const wait = Math.ceil(intervalSeconds - diffMs / 1000);
        throw new BadRequestException(`Please wait ${wait} seconds before requesting a new code.`);
      }
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
      const durationSeconds = parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
      newExpiry.setSeconds(newExpiry.getSeconds() + durationSeconds);

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

  // --- MFA (2FA) LOGIC ---

  async enrollMfa(uid: string, type: MfaType) {
    if (type !== MfaType.TOTP) {
      throw new BadRequestException('Currently only TOTP MFA is supported');
    }

    let mfa = await this.mfaRepo.findOne({ where: { uid, type }, select: ['id', 'secret', 'isEnabled', 'type'] });

    if (mfa?.isEnabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    const secret = authenticator.generateSecret();
    const appName = this.options.appName || 'NestJS Auth';
    const otpauth = authenticator.keyuri(uid, appName, secret);

    if (!mfa) {
      mfa = this.mfaRepo.create({
        uid,
        type,
        secret,
        isEnabled: false,
      });
    } else {
      mfa.secret = secret;
    }

    await this.mfaRepo.save(mfa);

    return {
      secret,
      otpauth,
    };
  }

  async activateMfa(uid: string, type: MfaType, code: string) {
    const mfa = await this.mfaRepo.findOne({
      where: { uid, type },
      select: ['id', 'secret', 'isEnabled']
    });

    if (!mfa) {
      throw new BadRequestException('No MFA enrollment found');
    }

    if (mfa.isEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: mfa.secret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    mfa.isEnabled = true;
    mfa.isDefault = true;
    await this.mfaRepo.save(mfa);

    return { message: 'MFA activated successfully' };
  }

  async viewAll() {
    const auths = await this.authRepo.find();
    return auths;
  }

  async viewAllMyAuthMethods(uid: string) {
    const auths = await this.authRepo.find({ where: { uid } });
    return auths;
  }

  async deleteAccount(uid: string) {
    // 1. Delete all sessions for this UID
    await this.sessionRepository.delete({ uid });

    // 2. Delete all MFA methods for this UID
    await this.mfaRepo.delete({ uid });

    // 3. Delete all OTP tokens requested by this UID
    await this.otpRepo.delete({ requestUserId: uid });

    // 4. Delete all Auth methods for this UID. 
    // TypeORM should handle cascading deletion of AuthIdentifier and OAuthProvider if configured.
    // However, if not configured with ON DELETE CASCADE in the DB, it's safer to use repo.remove or repo.delete.
    // Using repo.delete with uid will delete all matching Auth records.
    await this.authRepo.delete({ uid });
  }

  async deleteAuthMethod(uid: string, authId: string) {
    const auth = await this.authRepo.findOne({ where: { id: authId, uid } });
    if (!auth) {
      throw new BadRequestException('Authentication method not found or does not belong to user');
    }

    // Check if this is the last auth method
    const count = await this.authRepo.count({ where: { uid } });
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the last authentication method. Delete account instead.');
    }

    // If deleting the primary auth method, we might need to assign a new one
    if (auth.isPrimary) {
      const nextAuth = await this.authRepo.findOne({ where: { uid, id: authId } }); // This is wrong, should be NOT authId
    }

    // Actually, let's keep it simple for now: just delete it.
    // If it was primary, the next available one should ideally become primary.
    await this.authRepo.delete(authId);

    // After deletion, find if there's any primary left. 
    // If not, assign the first available one as primary.
    const hasPrimary = await this.authRepo.findOne({ where: { uid, isPrimary: true } });
    if (!hasPrimary) {
      const remainingAuth = await this.authRepo.findOne({ where: { uid } });
      if (remainingAuth) {
        remainingAuth.isPrimary = true;
        await this.authRepo.save(remainingAuth);
      }
    }
  }
}

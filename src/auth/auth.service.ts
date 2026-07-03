import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/requests/signup.dto';
import { LoginDto } from './dto/requests/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthStrategy } from './enums/auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity';
import { OtpToken, OtpPurpose } from './entities/otp-token.entity';
import { MfaMethod, MfaType } from './entities/mfa-method.entity';
import { authenticator } from 'otplib';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions, SessionCreationPolicy } from './interfaces/auth-module-options.interface';
import { AUTH_NOTIFICATION_PROVIDER, AuthNotificationProvider } from './interfaces/auth-notification-provider.interface';
import * as crypto from 'crypto';
import { parseDuration } from './utils/duration.util';
import { AuthMapper } from './core/auth-mapper';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/requests/magic-link.dto';
import { SecureAccountDto } from './dto/requests/secure-account.dto';
import { AuthIdentifier, IdentifierType } from './entities/auth-identify.entity';
import { AuthEvents } from './enums/auth.events';
import { SessionEvent, SessionLog } from './entities/session_log.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly createSessionLog = this.options.createSessionLogOnInvalid ?? false

  constructor(
    private jwtService: JwtService,
    @Optional() private passwordStrategy: LocalAuthStrategy,
    @Optional() private oauthStrategy: OAuthAuthStrategy,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(SessionLog)
    private sessionLogRepo: Repository<SessionLog>,
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
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) { }

  // --- INTERNAL HELPER: Generate Token Pair ---
  private async generateTokens(uid: string, sessionId: string, namespace?: string) {
    const refreshJti = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: uid, sessionId, namespace },
        {
          secret: this.options.jwtSecret || process.env.JWT_SECRET,
          expiresIn: (this.options.accessTokenExpiresIn || '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: uid, sessionId, jti: refreshJti, namespace },
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
    namespace?: string,
  ) {
    const expiresAt = new Date();
    const durationSeconds = parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
    expiresAt.setSeconds(expiresAt.getSeconds() + durationSeconds);

    const deviceFingerprint = this.fingerprint(userAgent);
    let session: Session;

    const _createSession = (): Session => {
      return this.sessionRepository.create({
        id: crypto.randomUUID(),
        uid,
        namespace,
        deviceFingerprint,
        ipAddress: ip,
        expiresAt,
        refreshTokenHash: '',
        userAgent,
      })
    }

    if (this.options.sessionCreationPolicy === SessionCreationPolicy.REUSE_DEVICE) {
      session = await this.sessionRepository.findOne({
        where: {
          uid,
          namespace,
          deviceFingerprint,
        },
      });
      if (session) {
        session.expiresAt = expiresAt;
        session.ipAddress = ip;
        session.userAgent = userAgent;
        session.deviceFingerprint = deviceFingerprint;
      } else {
        session = _createSession();
      }
    } else {
      session = _createSession();
    }

    const tokens = await this.generateTokens(uid, session.id, namespace);

    session.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.sessionRepository.save(session);

    return tokens;
  }

  private async createSessionLogFromSessionIfEnabled({
    event,
    reason,
    session,
  }: {
    event: SessionEvent;
    reason?: string;
    session: Session;
  }) {
    if (!this.createSessionLog) return;

    const sessionLog = this.sessionLogRepo.create({
      ...session,
      sessionId: session.id,
      event,
      reason,
    });

    await this.sessionLogRepo.save(sessionLog);
  }

  private async invalidateSession({
    session,
    sessionId,
    event,
    reason,
  }: {
    session?: Session;
    sessionId?: string;
    event: SessionEvent;
    reason: string;
  }) {
    if (!session && !sessionId) {
      throw new Error("Either session or sessionId must be provided.");
    }

    if (!session) {
      session = await this.sessionRepository.findOneByOrFail({ id: sessionId! });
    }

    await this.createSessionLogFromSessionIfEnabled({
      session,
      event,
      reason,
    });

    await this.sessionRepository.delete(session.id);
  }

  private async invalidateSessions({
    uid,
    event,
    reason,
  }: {
    uid: string;
    event: SessionEvent;
    reason: string;
  }) {
    await this.sessionRepository.manager.transaction(async (manager) => {
      const sessions = await manager.find(Session, {
        where: { uid },
      });

      if (sessions.length === 0) {
        return;
      }

      if (this.createSessionLog) {
        const logs = sessions.map((session) =>
          this.sessionLogRepo.create({
            ...session,
            sessionId: session.id,
            event,
            reason,
          }),
        );

        await manager.save(logs);
      }

      await manager.delete(Session, {
        uid,
      });
    });
  }

  async signup({ dto, uid, userAgent, ip, namespace }: { dto: SignupDto, uid?: string, userAgent?: string, ip?: string, namespace?: string }) {
    if (!dto.method) throw new BadRequestException('Method is required');

    const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

    if (!enabledStrategies.includes(dto.method)) {
      throw new BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
    }

    let auth: Auth;
    let identifier: AuthIdentifier;
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

    const { secretHash, ...filteredAuth } = auth;

    if (triggerVerification) {
      if (this.notificationProvider) {
        if (!identifier?.isVerified || has2FA || isPasswordless) {
          await this.sendVerification(auth, identifier);
        }
        return {
          message: isPasswordless ? 'Passwordless signup: Verification code sent.' : 'Signup successful. Please verify your identity.',
          auth: filteredAuth,
          verificationRequired: true
        };
      } else if (isPasswordless) {
        throw new BadRequestException('A notification provider is required for passwordless signup.');
      } else if (this.options.verificationRequired) {
        throw new BadRequestException('Verification is required but no notification provider is configured.');
      }
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.SIGNUP, { auth: filteredAuth, identifier, extraData: dto.extraData });
    }

    return { ...tokens, auth: filteredAuth };
  }

  async login({ dto, userAgent, ip, namespace }: { dto: LoginDto, userAgent?: string, ip?: string, namespace?: string }) {
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

    if (!auth.isActive) {
      throw new ForbiddenException('This account is currently locked or disabled. Please contact support or reset your password.');
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


    if (triggerVerification) {
      if (this.notificationProvider) {
        await this.sendVerification(auth, identifier);
        return {
          message: isPasswordless ? 'Passwordless login: Verification code sent.' : 'Identity verification required.',
          auth,
          verificationRequired: true,
          tokens: undefined,
        };
      } else if (isPasswordless) {
        throw new BadRequestException('A notification provider is required for passwordless login.');
      } else if (this.options.verificationRequired) {
        throw new BadRequestException('Verification is required but no notification provider is configured.');
      }
    }

    const { secretHash, ...filteredAuth } = auth;

    // If MFA is enabled, inform client that additional MFA verification is required.
    if (has2FA) {
      return {
        message: 'MFA required',
        auth: filteredAuth,
        mfaRequired: true,
        tokens: undefined,
      };
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.LOGIN, { auth: filteredAuth, tokens });
    }

    return { ...tokens, auth: filteredAuth };
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
      if (this.options.debug) {
        this.logger.warn(`No email or phone found for Auth UID: ${auth.uid}. Verification skipped.`);
      }
      return;
    }

    // 2. Generate 6-digit code
    const code = (this.options.debugMode && this.options.defaultOtp)
      ? this.options.defaultOtp
      : Math.floor(100000 + Math.random() * 900000).toString();
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

  async verifyCode({ uid, code, userAgent, ip, namespace }: { uid: string, code: string, userAgent?: string, ip?: string, namespace?: string }) {
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

    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.IDENTITY_VERIFIED, { auth, tokens });
    }

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

  async refreshTokens({ refreshToken, currentUserAgent, currentIp, namespace }: {
    refreshToken: string,
    currentUserAgent: string,
    currentIp?: string,
    namespace: string,
  }) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sessionId: string, namespace?: string }>(
        refreshToken,
        { secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET },
      );

      const resolvedNamespace = namespace ?? payload.namespace

      const whereClause: { id: string, namespace?: string } = { id: payload.sessionId }
      if (resolvedNamespace) {
        whereClause.namespace = resolvedNamespace;
      }


      const session = await this.sessionRepository.findOne({
        where: whereClause,
        select: [
          'id',
          'uid',
          'refreshTokenHash',
          'expiresAt',
          'deviceFingerprint',
          'ipAddress',
          'namespace',
        ],
      });

      if (this.options.debug) {
        this.logger.debug(`Namespace from JWT: ${payload.namespace}, Namespace passed to refresh method: ${namespace}, Where clause: ${JSON.stringify(whereClause)}`)
      }

      if (!session) throw new ForbiddenException('Session not found');

      const incomingFingerprint = this.fingerprint(currentUserAgent);
      if (session.deviceFingerprint !== incomingFingerprint) {
        this.invalidateSession({ session, event: SessionEvent.REVOKE, reason: 'Device mismatch during refresh' })
        throw new ForbiddenException('Device mismatch');
      }

      if (session.namespace !== namespace && session.namespace !== resolvedNamespace) {
        if (this.options.debug) {
          this.logger.debug(`Namespace provided: ${namespace}, Session namespace: ${session.namespace}.\nNamespace mismatch: ${session.namespace !== namespace}`)
        }
        this.invalidateSession({ session, event: SessionEvent.REVOKE, reason: 'Namespace mismatch during refresh' })
        throw new ForbiddenException("Namespace mismatch")
      }

      if (new Date() > session.expiresAt) {
        this.invalidateSession({ session, event: SessionEvent.EXPIRE, reason: 'Session expired during refresh' })
        throw new ForbiddenException('Session expired');
      }

      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (!isMatch) {
        this.invalidateSession({ session, event: SessionEvent.REVOKE, reason: 'Invalid refresh token during refresh' })
        throw new ForbiddenException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(session.uid, session.id, namespace);

      const newHash = await bcrypt.hash(tokens.refreshToken, 10);

      const newExpiry = new Date();
      const durationSeconds = parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
      newExpiry.setSeconds(newExpiry.getSeconds() + durationSeconds);

      await this.sessionRepository.update(session.id, {
        refreshTokenHash: newHash,
        expiresAt: newExpiry,
        ipAddress: currentIp ?? session.ipAddress,
      });

      if (this.eventEmitter) {
        this.eventEmitter.emit(AuthEvents.TOKEN_REFRESHED, { uid: session.uid, tokens });
      }

      return tokens;
    } catch (e) {
      if (this.options.debug) {
        this.logger.error('Error refreshing tokens', e);
      }
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
        const session = await this.sessionRepository.findOne({ where: { id: payload.sessionId } });
        this.invalidateSession({ session, event: SessionEvent.LOGOUT, reason: 'User logout' })
        if (session && this.eventEmitter) {
          this.eventEmitter.emit(AuthEvents.LOGOUT, { uid: session.uid });
        }
      }
    } catch (e) {
      if (this.options.debug) {
        this.logger.error('Error logging out', e);
      }
    }
  }

  // --- PASSWORD MANAGEMENT & SECURITY ---

  async forgotPassword(dto: ForgotPasswordDto) {
    const value = dto.email || dto.phone || dto.username;
    if (!value) throw new BadRequestException('Identifier is required');

    // 1. Find identifier
    const identifier = await this.authRepo.query(
      `SELECT ai.*, a.uid, a.id as "authId" FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE ai.value = $1 LIMIT 1`,
      [value.toLowerCase()]
    );

    if (!identifier[0]) {
      // Security: Don't reveal if user exists. 
      // But typically for forgot-password, users expect an error if email is wrong.
      // We'll return success anyway to prevent enumeration.
      return { message: 'If an account exists, a reset code has been sent.' };
    }

    const primaryAuth = identifier[0];

    // 2. Generate OTP
    const code = (this.options.debugMode && this.options.defaultOtp)
      ? this.options.defaultOtp
      : Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (this.options.otpExpiresIn || 15));

    await this.otpRepo.save(this.otpRepo.create({
      identifier: primaryAuth.value,
      purpose: OtpPurpose.PASSWORD_RESET,
      codeHash: hash,
      expiresAt,
      requestUserId: primaryAuth.uid,
      requestAuthId: primaryAuth.authId,
    }));

    // 3. Send notification
    if (this.notificationProvider) {
      await this.notificationProvider.sendVerificationCode(primaryAuth.value, code, 'email');
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.PASSWORD_RESET, { auth: primaryAuth });
    }

    return { message: 'If an account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const otp = await this.otpRepo.findOne({
      where: { requestUserId: dto.uid, purpose: OtpPurpose.PASSWORD_RESET, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || new Date() > otp.expiresAt) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const isMatch = await bcrypt.compare(dto.code, otp.codeHash);
    if (!isMatch) throw new BadRequestException('Invalid reset code');

    // Update password
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.authRepo.update(otp.requestAuthId, {
      secretHash: hash,
      isActive: true // Unlock account on successful reset
    });

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepo.save(otp);

    // Security: Invalidate all sessions
    await this.invalidateSessions({ uid: dto.uid, event: SessionEvent.REVOKE, reason: 'User reset password' });

    if (this.eventEmitter) {
      const auth = await this.authRepo.findOne({ where: { uid: dto.uid } });
      this.eventEmitter.emit(AuthEvents.PASSWORD_RESET, { auth });
    }

    return { message: 'Password reset successful. All active sessions have been logged out.' };
  }

  async updatePassword(uid: string, dto: UpdatePasswordDto, userAgent?: string, ip?: string) {
    // 1. Get primary LOCAL auth
    const auth = await this.authRepo.findOne({
      where: { uid, strategy: In([AuthStrategy.LOCAL, AuthStrategy.EMAIL, AuthStrategy.PHONE, AuthStrategy.USERNAME]) as any },
      select: ['id', 'secretHash', 'uid']
    });

    if (!auth || !auth.secretHash) {
      throw new BadRequestException('Password update only available for local accounts');
    }

    // 2. Verify current password
    const isMatch = await bcrypt.compare(dto.currentPassword, auth.secretHash);
    if (!isMatch) throw new BadRequestException('Incorrect current password');

    // 3. Hash and save new password
    auth.secretHash = await bcrypt.hash(dto.newPassword, 10);
    await this.authRepo.save(auth);

    // 4. Notification with Security Link
    if (this.notificationProvider?.sendPasswordChangedNotification) {
      const secureToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(secureToken, 10);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Get user email
      const identifier = await this.authRepo.query(
        `SELECT value FROM auth_identifiers WHERE "authId" = $1 AND type = 'EMAIL' LIMIT 1`,
        [auth.id]
      );

      if (identifier[0]) {
        await this.otpRepo.save(this.otpRepo.create({
          identifier: identifier[0].value,
          purpose: OtpPurpose.SECURE_ACCOUNT,
          codeHash: tokenHash,
          expiresAt,
          requestUserId: auth.uid,
          requestAuthId: auth.id,
        }));

        const secureLink = `${this.options.frontendUrl || ''}/auth/secure?token=${secureToken}&uid=${auth.uid}`;

        await this.notificationProvider.sendPasswordChangedNotification(identifier[0].value, {
          ip: ip || 'Unknown',
          userAgent: userAgent || 'Unknown',
          secureAccountLink: secureLink,
        });
      }
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.PASSWORD_UPDATED, { auth });
    }

    return { message: 'Password updated successfully' };
  }

  async secureAccount(dto: SecureAccountDto & { uid: string }) {
    const otp = await this.otpRepo.findOne({
      where: { requestUserId: dto.uid, purpose: OtpPurpose.SECURE_ACCOUNT, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || new Date() > otp.expiresAt) {
      throw new BadRequestException('Invalid or expired security token');
    }

    const isMatch = await bcrypt.compare(dto.token, otp.codeHash);
    if (!isMatch) throw new BadRequestException('Invalid security token');

    // 1. Lock all auth methods
    await this.authRepo.update({ uid: dto.uid }, { isActive: false });

    // 2. Invalidate sessions
    this.invalidateSessions({ uid: dto.uid, event: SessionEvent.REVOKE, reason: 'User secured account by invalidating all sessions' })

    // 3. Mark OTP as used
    otp.isUsed = true;
    await this.otpRepo.save(otp);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.ACCOUNT_SECURED, { uid: dto.uid });
    }

    return { message: 'Account secured and locked. Please reset your password to regain access.' };
  }

  // --- MAGIC LINK ---

  async requestMagicLink(dto: MagicLinkRequestDto) {
    const identifier = await this.authRepo.query(
      `SELECT ai.*, a.id as "authId", a.uid FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE ai.value = $1 LIMIT 1`,
      [dto.email.toLowerCase()]
    );

    let authId: string;
    let uid: string;

    if (!identifier[0]) {
      // Optional: Auto-signup if not exists, but let's stick to existing for now
      throw new BadRequestException('No account found with this email');
    } else {
      authId = identifier[0].authId;
      uid = identifier[0].uid;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.otpRepo.save(this.otpRepo.create({
      identifier: dto.email.toLowerCase(),
      purpose: OtpPurpose.MAGIC_LINK,
      codeHash: hash,
      expiresAt,
      requestUserId: uid,
      requestAuthId: authId,
    }));

    if (this.notificationProvider?.sendMagicLink) {
      const link = `${this.options.frontendUrl || ''}/auth/magic-callback?token=${token}&email=${dto.email}`;
      await this.notificationProvider.sendMagicLink(dto.email, link);
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.MAGIC_LINK_REQUESTED, { email: dto.email });
    }

    return { message: 'Magic link sent to your email.' };
  }

  async verifyMagicLink({ dto, userAgent, ip, namespace }: { dto: MagicLinkVerifyDto, userAgent?: string, ip?: string, namespace?: string }) {
    const otp = await this.otpRepo.findOne({
      where: { purpose: OtpPurpose.MAGIC_LINK, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || new Date() > otp.expiresAt) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    const isMatch = await bcrypt.compare(dto.token, otp.codeHash);
    if (!isMatch) throw new BadRequestException('Invalid magic link');

    otp.isUsed = true;
    await this.otpRepo.save(otp);

    const auth = await this.authRepo.findOne({ where: { id: otp.requestAuthId } });
    if (!auth) throw new BadRequestException('Identity not found');

    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.IDENTITY_VERIFIED, { auth, tokens });
    }

    return { tokens, auth };
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

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.MFA_ENROLLED, { uid, type });
    }

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

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.MFA_ACTIVATED, { uid, type });
    }

    return { message: 'MFA activated successfully' };
  }

  async viewAll() {
    const auths = await this.authRepo.find({ relations: ['identifiers', 'oauthProviders'] });
    return AuthMapper.toDtoList(auths);
  }

  async me(uid: string) {
    const auth = await this.authRepo.findOne({ where: { uid }, relations: ['identifiers', 'oauthProviders'] });
    return AuthMapper.toDto(auth);
  }

  async viewAllMyAuthMethods(uid: string) {
    const auths = await this.authRepo.find({ where: { uid }, relations: ['identifiers', 'oauthProviders'] });
    return AuthMapper.toDtoList(auths);
  }

  async deleteAccount(uid: string) {
    // 1. Delete all sessions for this UID
    await this.invalidateSessions({ uid, event: SessionEvent.DELETE, reason: 'User deleted account' });

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

  async getSessions({ uid, namespace }: { uid: string, namespace?: string }): Promise<Session[]> {
    const whereClause: { uid: string, namespace?: string } = { uid };
    if (typeof namespace === "string") {
      whereClause.namespace = namespace;
    }
    const sessions = this.sessionRepository.find({ where: whereClause, relations: [] });
    return (await sessions).map((d) => Object.assign(new Session(), d.toMap()));
  }

  async getSession(id: string) {
    return this.sessionRepository.findOne({ where: { id } });
  }

  async revokeSession({ sessionId }: { sessionId: string }) {
    await this.invalidateSession({ sessionId, event: SessionEvent.REVOKE, reason: 'User requested session revoke' })
  }

  async getSessionLogs({ uid, namespace }: { uid: string, namespace?: string }): Promise<SessionLog[]> {
    const whereClause: { uid: string, namespace?: string } = { uid };
    if (typeof namespace === "string") {
      whereClause.namespace = namespace;
    }
    const sessions = this.sessionLogRepo.find({ where: whereClause, relations: [] });
    return (await sessions).map((d) => Object.assign(new SessionLog(), d.toMap()));
  }

}

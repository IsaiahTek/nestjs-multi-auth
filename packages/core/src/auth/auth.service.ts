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
import {
  AUTH_REPOSITORY_TOKEN,
  SESSION_REPOSITORY_TOKEN,
  SESSION_LOG_REPOSITORY_TOKEN,
  MFA_METHOD_REPOSITORY_TOKEN,
  AUTH_IDENTIFIER_REPOSITORY_TOKEN,
} from './interfaces/repository-tokens';
import {
  AuthRepository,
  SessionRepository,
  SessionLogRepository,
  MfaMethodRepository,
  AuthIdentifierRepository,
} from './interfaces/repositories.interface';
import { AUTH_OTP_PROVIDER, AUTH_OTP_PROVIDER_EMAIL, AUTH_OTP_PROVIDER_PHONE, AuthOtpProvider } from './interfaces/auth-otp-provider.interface';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/requests/signup.dto';
import { LoginDto } from './dto/requests/login.dto';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { OAuthAuthStrategy } from './strategies/oauth/oauth.strategy';
import { AuthStrategy } from './enums/auth-type.enum';
import { Auth, Session, OtpToken, MfaMethod } from './interfaces/models.interface';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { MfaType } from './enums/mfa-type.enum';
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
import { AuthIdentifier } from './interfaces/models.interface';
import { IdentifierType } from './enums/identifier-type.enum';
import { AuthEvents } from './enums/auth.events';
import { SessionLog } from './interfaces/models.interface';
import { SessionEvent } from './enums/session-event.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly createSessionLog = this.options.createSessionLogOnInvalid ?? false

  constructor(
    private jwtService: JwtService,
    @Optional() private passwordStrategy: LocalAuthStrategy,
    @Optional() private oauthStrategy: OAuthAuthStrategy,
    @Inject(SESSION_REPOSITORY_TOKEN)
    private sessionRepository: SessionRepository,
    @Inject(SESSION_LOG_REPOSITORY_TOKEN)
    private sessionLogRepo: SessionLogRepository,
    @Inject(AUTH_REPOSITORY_TOKEN)
    private authRepo: AuthRepository,
    @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN)
    private authIdentifierRepo: AuthIdentifierRepository,
    @Inject(AUTH_OTP_PROVIDER)
    private otpProvider: AuthOtpProvider,
    @Inject(AUTH_OTP_PROVIDER_EMAIL)
    private otpProviderEmail: AuthOtpProvider,
    @Inject(AUTH_OTP_PROVIDER_PHONE)
    private otpProviderPhone: AuthOtpProvider,
    @Inject(MFA_METHOD_REPOSITORY_TOKEN)
    private mfaRepo: MfaMethodRepository,
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    @Optional()
    @Inject(AUTH_NOTIFICATION_PROVIDER)
    private notificationProvider?: AuthNotificationProvider,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) { }

  /** Returns the correct OTP provider for the given identifier type. */
  private resolveOtpProvider(identifierType?: 'email' | 'phone'): AuthOtpProvider {
    if (identifierType === 'email') return this.otpProviderEmail;
    if (identifierType === 'phone') return this.otpProviderPhone;
    return this.otpProvider;
  }

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

    const _createSession = async (): Promise<Session> => {
      return this.sessionRepository.create({
        id: crypto.randomUUID(),
        uid,
        namespace,
        deviceFingerprint,
        ipAddress: ip,
        expiresAt,
        refreshTokenHash: '',
        userAgent,
      });
    }

    if (this.options.sessionCreationPolicy === SessionCreationPolicy.REUSE_DEVICE) {
      session = await this.sessionRepository.findDeviceSession(uid, namespace, deviceFingerprint) as any;
      if (session) {
        session.expiresAt = expiresAt;
        session.ipAddress = ip;
        session.userAgent = userAgent;
        session.deviceFingerprint = deviceFingerprint;
      } else {
        session = await _createSession();
      }
    } else {
      session = await _createSession();
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

    const sessionLog = await this.sessionLogRepo.create({
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
      const foundSession = await this.sessionRepository.findById(sessionId!);
      if (!foundSession) throw new Error("Session not found");
      session = foundSession as any;
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
    const sessions = await this.sessionRepository.findByUid(uid);
    if (sessions.length === 0) {
      return;
    }

    if (this.createSessionLog) {
      const logs = sessions.map((session) =>
      ({
        ...session,
        id: undefined as any,
        sessionId: session.id,
        event,
        reason,
        timestamp: new Date()
      })
      );
      for (const log of logs) {
        await this.sessionLogRepo.save(log as any);
      }
    }

    await this.sessionRepository.deleteByUid(uid);
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
    const mfaMethod = await this.mfaRepo.findByUidAndEnabled(auth.uid);
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
    const mfaMethod = await this.mfaRepo.findByUidAndEnabled(auth.uid);
    const has2FA = !!mfaMethod;

    // Trigger email/phone verification only if required and identifier not verified.
    // MFA (2FA) is handled separately via dedicated endpoints.
    const triggerVerification = isPasswordless ||
      (this.options.verificationRequired && !identifier?.isVerified);

    const { secretHash, ...filteredAuth } = auth;

    if (triggerVerification) {
      if (this.notificationProvider) {
        await this.sendVerification(auth, identifier);
        return {
          message: isPasswordless ? 'Passwordless login: Verification code sent.' : 'Identity verification required.',
          auth: filteredAuth,
          verificationRequired: true,
          tokens: undefined,
        };
      } else if (isPasswordless) {
        throw new BadRequestException('A notification provider is required for passwordless login.');
      } else if (this.options.verificationRequired) {
        throw new BadRequestException('Verification is required but no notification provider is configured.');
      }
    }

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

  private async sendVerification(auth: any, currentIdentifier?: any) {
    if (!this.notificationProvider && !this.otpProvider && !this.otpProviderEmail && !this.otpProviderPhone) return;

    let primaryIdentifier = currentIdentifier?.type !== 'USERNAME' ? currentIdentifier : null;

    if (!primaryIdentifier) {
      primaryIdentifier = await this.authIdentifierRepo.findByUidAndTypes(auth.uid, ['EMAIL', 'PHONE']);
    }

    if (!primaryIdentifier) {
      const fullAuth = await this.authRepo.findWithIdentifiers(auth.id);
      primaryIdentifier = fullAuth?.identifiers?.find(id => id.type === 'EMAIL' || id.type === 'PHONE');
    }

    if (!primaryIdentifier) {
      if (this.options.debug) {
        this.logger.warn(`No email or phone found for Auth UID: ${auth.uid}. Verification skipped.`);
      }
      return;
    }

    const purpose = primaryIdentifier.type === 'EMAIL' ? OtpPurpose.VERIFY_EMAIL : OtpPurpose.VERIFY_PHONE;

    const idType: 'email' | 'phone' = primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone';
    const result = await this.resolveOtpProvider(idType).issue({
      uid: auth.uid,
      authId: auth.id,
      identifier: primaryIdentifier.value,
      identifierType: idType,
      purpose,
      expiresIn: this.options.otpExpiresIn,
    });

    if (!result.handledDelivery && this.notificationProvider && result.code) {
      try {
        await this.notificationProvider.sendVerificationCode({
          to: primaryIdentifier.value,
          code: result.code,
          type: primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone',
          purpose,
          expiresAt: result.expiresAt
        });
      } catch (e) {
        this.logger.error(`Failed to send verification code to ${primaryIdentifier.value}`, e);
        throw new BadRequestException('Failed to send verification code');
      }
    }
  }

  async verifyCode({ uid, code, userAgent, ip, namespace }: { uid: string, code: string, userAgent?: string, ip?: string, namespace?: string }) {
    const auth = await this.authRepo.findByUid(uid);
    if (!auth) throw new BadRequestException('Identity not found');

    const result = await this.resolveOtpProvider().verify({ uid, code });

    if (result.success) {
      auth.isVerified = true;
      await this.authRepo.save(auth);

      await this.authIdentifierRepo.markVerifiedByAuthId(auth.id);

      if (result.authId && result.authId !== auth.id) {
        await this.authRepo.update(result.authId, { isVerified: true });
        await this.authIdentifierRepo.markVerifiedByAuthId(result.authId);
      }
    }

    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.IDENTITY_VERIFIED, { auth, tokens });
    }

    return { message: 'Identity verified successfully', tokens, auth };
  }

  async resendVerification(uid: string) {
    const auth = await this.authRepo.findByUid(uid);
    if (!auth) throw new BadRequestException('Identity not found');

    if (!this.resolveOtpProvider().resend) {
      await this.sendVerification(auth);
      return { message: 'Verification code resent' };
    }

    const result = await this.resolveOtpProvider().resend!({ uid });
    if (!result.handledDelivery && this.notificationProvider && result.code && result.metadata) {
      await this.notificationProvider.sendVerificationCode({
        to: result.metadata.identifier,
        code: result.code,
        type: result.metadata.identifierType,
        purpose: result.metadata.purpose,
        expiresAt: result.expiresAt
      });
    }

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

      const session = await this.sessionRepository.findByIdWithDetails(payload.sessionId, resolvedNamespace);

      if (this.options.debug) {
        this.logger.debug(`Namespace from JWT: ${payload.namespace}, Namespace passed to refresh method: ${namespace}`)
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
        const session = await this.sessionRepository.findById(payload.sessionId);
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

    const result = await this.authIdentifierRepo.findWithAuthByValue(value);

    if (!result) {
      return { message: 'If an account exists, a reset code has been sent.' };
    }

    const { identifier: primaryAuth, auth: primaryAuthObj } = result;

    const resetIdType: 'email' | 'phone' = primaryAuth.type === 'PHONE' ? 'phone' : 'email';
    const issueResult = await this.resolveOtpProvider(resetIdType).issue({
      uid: primaryAuthObj.uid,
      authId: primaryAuthObj.id,
      identifier: primaryAuth.value,
      identifierType: resetIdType,
      purpose: OtpPurpose.PASSWORD_RESET,
      expiresIn: this.options.otpExpiresIn || 15
    });

    if (!issueResult.handledDelivery && this.notificationProvider && issueResult.code) {
      await this.notificationProvider.sendVerificationCode({
        to: primaryAuth.value,
        code: issueResult.code,
        type: primaryAuth.type === 'PHONE' ? 'phone' : 'email',
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt: issueResult.expiresAt
      });
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.PASSWORD_RESET, { auth: primaryAuth });
    }

    return { message: 'If an account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.resolveOtpProvider().verify({ uid: dto.uid, code: dto.code, purpose: OtpPurpose.PASSWORD_RESET });

    if (!result.success || !result.authId) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.authRepo.update(result.authId, {
      secretHash: hash,
      isActive: true // Unlock account on successful reset
    });

    // Security: Invalidate all sessions
    await this.invalidateSessions({ uid: dto.uid, event: SessionEvent.REVOKE, reason: 'User reset password' });

    if (this.eventEmitter) {
      const auth = await this.authRepo.findByUid(dto.uid);
      this.eventEmitter.emit(AuthEvents.PASSWORD_RESET, { auth });
    }

    return { message: 'Password reset successful. All active sessions have been logged out.' };
  }

  async updatePassword(uid: string, dto: UpdatePasswordDto, userAgent?: string, ip?: string) {
    // 1. Get primary LOCAL auth
    const auth = await this.authRepo.findByUidAndStrategies(uid, [AuthStrategy.LOCAL, AuthStrategy.EMAIL, AuthStrategy.PHONE, AuthStrategy.USERNAME] as any[]);

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
      const identifier = await this.authIdentifierRepo.findByUidAndTypes(auth.uid, ['EMAIL']);

      if (identifier) {
        const issueResult = await this.resolveOtpProvider('email').issue({
          uid: auth.uid,
          authId: auth.id,
          identifier: identifier.value,
          identifierType: 'email',
          purpose: OtpPurpose.SECURE_ACCOUNT,
          expiresIn: 24 * 60
        });

        if (issueResult.code) {
          const secureLink = `${this.options.frontendUrl || ''}/auth/secure?token=${issueResult.code}&uid=${auth.uid}`;

          await this.notificationProvider.sendPasswordChangedNotification(identifier.value, {
            ip: ip || 'Unknown',
            userAgent: userAgent || 'Unknown',
            secureAccountLink: secureLink,
          });
        }
      }
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.PASSWORD_UPDATED, { auth });
    }

    return { message: 'Password updated successfully' };
  }

  async secureAccount(dto: SecureAccountDto & { uid: string }) {
    const result = await this.resolveOtpProvider('email').verify({
      uid: dto.uid,
      code: dto.token,
      purpose: OtpPurpose.SECURE_ACCOUNT,
    });

    if (!result.success) {
      throw new BadRequestException('Invalid or expired security token');
    }

    // 1. Lock all auth methods
    const auths = await this.authRepo.findAllByUid(dto.uid);
    for (const auth of auths) {
      await this.authRepo.update(auth.id, { isActive: false });
    }

    // 2. Invalidate sessions
    this.invalidateSessions({ uid: dto.uid, event: SessionEvent.REVOKE, reason: 'User secured account by invalidating all sessions' })

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.ACCOUNT_SECURED, { uid: dto.uid });
    }

    return { message: 'Account secured and locked. Please reset your password to regain access.' };
  }

  // --- MAGIC LINK ---

  async requestMagicLink(dto: MagicLinkRequestDto) {
    const result = await this.authIdentifierRepo.findWithAuthByValue(dto.email.toLowerCase());

    if (!result) {
      // Optional: Auto-signup if not exists, but let's stick to existing for now
      throw new BadRequestException('No account found with this email');
    }

    const { auth: primaryAuthObj } = result;

    const issueResult = await this.resolveOtpProvider('email').issue({
      uid: primaryAuthObj.uid,
      authId: primaryAuthObj.id,
      identifier: dto.email.toLowerCase(),
      identifierType: 'email',
      purpose: OtpPurpose.MAGIC_LINK,
      expiresIn: 15
    });

    if (this.notificationProvider?.sendMagicLink && issueResult.code) {
      const link = `${this.options.frontendUrl || ''}/auth/magic-callback?token=${issueResult.code}&email=${dto.email}`;
      await this.notificationProvider.sendMagicLink(dto.email, link);
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.MAGIC_LINK_REQUESTED, { email: dto.email });
    }

    return { message: 'Magic link sent to your email.' };
  }

  async verifyMagicLink({ dto, userAgent, ip, namespace }: { dto: MagicLinkVerifyDto, userAgent?: string, ip?: string, namespace?: string }) {
    const identifier = await this.authIdentifierRepo.findWithAuthByValue(dto.email.toLowerCase());
    if (!identifier) throw new BadRequestException('Identity not found');

    const result = await this.resolveOtpProvider('email').verify({
      uid: identifier.auth.uid,
      code: dto.token,
      purpose: OtpPurpose.MAGIC_LINK
    });

    if (!result.success || !result.authId) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    const auth = await this.authRepo.findById(result.authId);
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

    let mfa = await this.mfaRepo.findByUidAndType(uid, type) as any;

    if (mfa?.isEnabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    const secret = authenticator.generateSecret();
    const appName = this.options.appName || 'NestJS Auth';
    const otpauth = authenticator.keyuri(uid, appName, secret);

    if (!mfa) {
      mfa = await this.mfaRepo.create({
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

    return { secret, otpauth };
  }

  async activateMfa(uid: string, type: MfaType, code: string) {
    const mfa = await this.mfaRepo.findByUidAndType(uid, type) as any;

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

  async mfaLogin(uid: string, code: string, userAgent?: string, ip?: string, namespace?: string) {
    const auth = await this.authRepo.findByUid(uid);
    if (!auth) throw new BadRequestException('Identity not found');

    const mfa = await this.mfaRepo.findByUidAndEnabled(uid);
    if (!mfa) throw new BadRequestException('MFA is not enabled for this account');

    const isValid = authenticator.verify({
      token: code,
      secret: mfa.secret,
    });

    if (!isValid) throw new BadRequestException('Invalid MFA code');

    const { secretHash, ...filteredAuth } = auth;
    const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.LOGIN, { auth: filteredAuth, tokens });
    }

    return { message: 'Login successful', tokens, auth: filteredAuth };
  }

  async deactivateMfa(uid: string, type: MfaType) {
    const mfa = await this.mfaRepo.findByUidAndType(uid, type) as any;

    if (!mfa) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    await this.mfaRepo.deleteByUid(uid);

    if (this.eventEmitter) {
      this.eventEmitter.emit(AuthEvents.MFA_DEACTIVATED, { uid, type });
    }

    return { message: 'MFA deactivated successfully' };
  }

  async viewAll() {
    const auths = await this.authRepo.findAll();
    return AuthMapper.toDtoList(auths);
  }

  async me(uid: string) {
    const auths = await this.authRepo.findAllByUid(uid);
    return AuthMapper.toDto(auths[0]);
  }

  async viewAllMyAuthMethods(uid: string) {
    const auths = await this.authRepo.findAllByUid(uid);
    return AuthMapper.toDtoList(auths);
  }

  async deleteAccount(uid: string) {
    // 1. Delete all sessions for this UID
    await this.invalidateSessions({ uid, event: SessionEvent.DELETE, reason: 'User deleted account' });

    // 2. Delete all MFA methods for this UID
    await this.mfaRepo.deleteByUid(uid);

    // 3. Delete all Auth methods for this UID. 
    await this.authRepo.deleteByUid(uid);
  }

  async deleteAuthMethod(uid: string, authId: string) {
    const auth = await this.authRepo.findById(authId);
    if (!auth || auth.uid !== uid) {
      throw new BadRequestException('Authentication method not found or does not belong to user');
    }

    // Check if this is the last auth method
    const allAuths = await this.authRepo.findAllByUid(uid);
    if (allAuths.length <= 1) {
      throw new BadRequestException('Cannot delete the last authentication method. Delete account instead.');
    }

    await this.authRepo.delete(authId);

    // After deletion, find if there's any primary left. 
    // If not, assign the first available one as primary.
    const remainingAuths = await this.authRepo.findAllByUid(uid);
    if (remainingAuths.length > 0 && !remainingAuths.some(a => a.isPrimary)) {
      const remainingAuth = remainingAuths[0];
      remainingAuth.isPrimary = true;
      await this.authRepo.save(remainingAuth);
    }
  }

  async getSessions({ uid, namespace }: { uid: string, namespace?: string }): Promise<Session[]> {
    const sessions = await this.sessionRepository.findByUid(uid);
    if (namespace !== undefined) {
      return sessions.filter(s => s.namespace === namespace);
    }
    return sessions;
  }

  async getSession(id: string) {
    return this.sessionRepository.findById(id);
  }

  async revokeSession({ sessionId }: { sessionId: string }) {
    await this.invalidateSession({ sessionId, event: SessionEvent.REVOKE, reason: 'User requested session revoke' })
  }

  async getSessionLogs({ uid, namespace }: { uid: string, namespace?: string }): Promise<SessionLog[]> {
    return this.sessionLogRepo.findByUidAndNamespace(uid, namespace);
  }
}

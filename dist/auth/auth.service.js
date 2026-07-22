"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const repository_tokens_1 = require("./interfaces/repository-tokens");
const auth_otp_provider_interface_1 = require("./interfaces/auth-otp-provider.interface");
const bcrypt = require("bcrypt");
const local_auth_strategy_1 = require("./strategies/local-auth.strategy");
const oauth_strategy_1 = require("./strategies/oauth/oauth.strategy");
const auth_type_enum_1 = require("./enums/auth-type.enum");
const otp_purpose_enum_1 = require("./enums/otp-purpose.enum");
const mfa_type_enum_1 = require("./enums/mfa-type.enum");
const otplib_1 = require("otplib");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const crypto = require("crypto");
const duration_util_1 = require("./utils/duration.util");
const auth_mapper_1 = require("./core/auth-mapper");
const auth_events_1 = require("./enums/auth.events");
const session_event_enum_1 = require("./enums/session-event.enum");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, passwordStrategy, oauthStrategy, sessionRepository, sessionLogRepo, authRepo, authIdentifierRepo, otpProvider, otpProviderEmail, otpProviderPhone, mfaRepo, options, notificationProvider, eventEmitter) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.oauthStrategy = oauthStrategy;
        this.sessionRepository = sessionRepository;
        this.sessionLogRepo = sessionLogRepo;
        this.authRepo = authRepo;
        this.authIdentifierRepo = authIdentifierRepo;
        this.otpProvider = otpProvider;
        this.otpProviderEmail = otpProviderEmail;
        this.otpProviderPhone = otpProviderPhone;
        this.mfaRepo = mfaRepo;
        this.options = options;
        this.notificationProvider = notificationProvider;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.createSessionLog = this.options.createSessionLogOnInvalid ?? false;
    }
    /** Returns the correct OTP provider for the given identifier type. */
    resolveOtpProvider(identifierType) {
        if (identifierType === 'email')
            return this.otpProviderEmail;
        if (identifierType === 'phone')
            return this.otpProviderPhone;
        return this.otpProvider;
    }
    // --- INTERNAL HELPER: Generate Token Pair ---
    async generateTokens(uid, sessionId, namespace) {
        const refreshJti = crypto.randomUUID();
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: uid, sessionId, namespace }, {
                secret: this.options.jwtSecret || process.env.JWT_SECRET,
                expiresIn: (this.options.accessTokenExpiresIn || '15m'),
            }),
            this.jwtService.signAsync({ sub: uid, sessionId, jti: refreshJti, namespace }, {
                secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET,
                expiresIn: (this.options.refreshTokenExpiresIn || '7d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    fingerprint(userAgent) {
        return crypto.createHash('sha256').update(userAgent).digest('hex');
    }
    // --- INTERNAL HELPER: Create/Update Session in DB ---
    async createSession(uid, userAgent = 'Unknown', ip = 'Unknown', namespace) {
        const expiresAt = new Date();
        const durationSeconds = (0, duration_util_1.parseDuration)(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
        expiresAt.setSeconds(expiresAt.getSeconds() + durationSeconds);
        const deviceFingerprint = this.fingerprint(userAgent);
        let session;
        const _createSession = async () => {
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
        };
        if (this.options.sessionCreationPolicy === auth_module_options_interface_1.SessionCreationPolicy.REUSE_DEVICE) {
            session = await this.sessionRepository.findDeviceSession(uid, namespace, deviceFingerprint);
            if (session) {
                session.expiresAt = expiresAt;
                session.ipAddress = ip;
                session.userAgent = userAgent;
                session.deviceFingerprint = deviceFingerprint;
            }
            else {
                session = await _createSession();
            }
        }
        else {
            session = await _createSession();
        }
        const tokens = await this.generateTokens(uid, session.id, namespace);
        session.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
        await this.sessionRepository.save(session);
        return tokens;
    }
    async createSessionLogFromSessionIfEnabled({ event, reason, session, }) {
        if (!this.createSessionLog)
            return;
        const sessionLog = await this.sessionLogRepo.create({
            ...session,
            sessionId: session.id,
            event,
            reason,
        });
        await this.sessionLogRepo.save(sessionLog);
    }
    async invalidateSession({ session, sessionId, event, reason, }) {
        if (!session && !sessionId) {
            throw new Error("Either session or sessionId must be provided.");
        }
        if (!session) {
            const foundSession = await this.sessionRepository.findById(sessionId);
            if (!foundSession)
                throw new Error("Session not found");
            session = foundSession;
        }
        await this.createSessionLogFromSessionIfEnabled({
            session,
            event,
            reason,
        });
        await this.sessionRepository.delete(session.id);
    }
    async invalidateSessions({ uid, event, reason, }) {
        const sessions = await this.sessionRepository.findByUid(uid);
        if (sessions.length === 0) {
            return;
        }
        if (this.createSessionLog) {
            const logs = sessions.map((session) => ({
                ...session,
                id: undefined,
                sessionId: session.id,
                event,
                reason,
                timestamp: new Date()
            }));
            for (const log of logs) {
                await this.sessionLogRepo.save(log);
            }
        }
        await this.sessionRepository.deleteByUid(uid);
    }
    async signup({ dto, uid, userAgent, ip, namespace }) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        let identifier;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.EMAIL:
            case auth_type_enum_1.AuthStrategy.PHONE:
            case auth_type_enum_1.AuthStrategy.USERNAME:
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                const localResult = await this.passwordStrategy.registerCredentials(dto, uid);
                auth = localResult.auth;
                identifier = localResult.identifier;
                break;
            case auth_type_enum_1.AuthStrategy.GOOGLE:
            case auth_type_enum_1.AuthStrategy.FACEBOOK:
            case auth_type_enum_1.AuthStrategy.APPLE:
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                const oauthResult = await this.oauthStrategy.registerCredentials(dto, uid);
                auth = oauthResult.auth;
                identifier = oauthResult.identifier;
                break;
            default:
                throw new Error('Unsupported signup provider');
        }
        // Force verification if no password was provided for local strategies (passwordless signup)
        const isPasswordless = [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(dto.method) && !dto.password;
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
            }
            else if (isPasswordless) {
                throw new common_1.BadRequestException('A notification provider is required for passwordless signup.');
            }
            else if (this.options.verificationRequired) {
                throw new common_1.BadRequestException('Verification is required but no notification provider is configured.');
            }
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.SIGNUP, { auth: filteredAuth, identifier, extraData: dto.extraData });
        }
        return { ...tokens, auth: filteredAuth };
    }
    async login({ dto, userAgent, ip, namespace }) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        let identifier;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.EMAIL:
            case auth_type_enum_1.AuthStrategy.PHONE:
            case auth_type_enum_1.AuthStrategy.USERNAME:
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                const localResult = await this.passwordStrategy.login(dto);
                auth = localResult.auth;
                identifier = localResult.identifier;
                break;
            case auth_type_enum_1.AuthStrategy.GOOGLE:
            case auth_type_enum_1.AuthStrategy.FACEBOOK:
            case auth_type_enum_1.AuthStrategy.APPLE:
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                const oauthResult = await this.oauthStrategy.login(dto);
                auth = oauthResult.auth;
                identifier = oauthResult.identifier;
                break;
            default:
                throw new Error('Unsupported login provider');
        }
        if (!auth.isActive) {
            throw new common_1.ForbiddenException('This account is currently locked or disabled. Please contact support or reset your password.');
        }
        // Force verification if no password was provided for local strategies (passwordless login)
        const isPasswordless = [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(dto.method) && !dto.password;
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
            }
            else if (isPasswordless) {
                throw new common_1.BadRequestException('A notification provider is required for passwordless login.');
            }
            else if (this.options.verificationRequired) {
                throw new common_1.BadRequestException('Verification is required but no notification provider is configured.');
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
            this.eventEmitter.emit(auth_events_1.AuthEvents.LOGIN, { auth: filteredAuth, tokens });
        }
        return { ...tokens, auth: filteredAuth };
    }
    // --- VERIFICATION LOGIC ---
    async sendVerification(auth, currentIdentifier) {
        if (!this.notificationProvider && !this.otpProvider && !this.otpProviderEmail && !this.otpProviderPhone)
            return;
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
        const purpose = primaryIdentifier.type === 'EMAIL' ? otp_purpose_enum_1.OtpPurpose.VERIFY_EMAIL : otp_purpose_enum_1.OtpPurpose.VERIFY_PHONE;
        const idType = primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone';
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
            }
            catch (e) {
                this.logger.error(`Failed to send verification code to ${primaryIdentifier.value}`, e);
                throw new common_1.BadRequestException('Failed to send verification code');
            }
        }
    }
    async verifyCode({ uid, code, userAgent, ip, namespace }) {
        const auth = await this.authRepo.findByUid(uid);
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
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
            this.eventEmitter.emit(auth_events_1.AuthEvents.IDENTITY_VERIFIED, { auth, tokens });
        }
        return { message: 'Identity verified successfully', tokens, auth };
    }
    async resendVerification(uid) {
        const auth = await this.authRepo.findByUid(uid);
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        if (!this.resolveOtpProvider().resend) {
            await this.sendVerification(auth);
            return { message: 'Verification code resent' };
        }
        const result = await this.resolveOtpProvider().resend({ uid });
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
    async refreshTokens({ refreshToken, currentUserAgent, currentIp, namespace }) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, { secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET });
            const resolvedNamespace = namespace ?? payload.namespace;
            const session = await this.sessionRepository.findByIdWithDetails(payload.sessionId, resolvedNamespace);
            if (this.options.debug) {
                this.logger.debug(`Namespace from JWT: ${payload.namespace}, Namespace passed to refresh method: ${namespace}`);
            }
            if (!session)
                throw new common_1.ForbiddenException('Session not found');
            const incomingFingerprint = this.fingerprint(currentUserAgent);
            if (session.deviceFingerprint !== incomingFingerprint) {
                this.invalidateSession({ session, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'Device mismatch during refresh' });
                throw new common_1.ForbiddenException('Device mismatch');
            }
            if (session.namespace !== namespace && session.namespace !== resolvedNamespace) {
                if (this.options.debug) {
                    this.logger.debug(`Namespace provided: ${namespace}, Session namespace: ${session.namespace}.\nNamespace mismatch: ${session.namespace !== namespace}`);
                }
                this.invalidateSession({ session, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'Namespace mismatch during refresh' });
                throw new common_1.ForbiddenException("Namespace mismatch");
            }
            if (new Date() > session.expiresAt) {
                this.invalidateSession({ session, event: session_event_enum_1.SessionEvent.EXPIRE, reason: 'Session expired during refresh' });
                throw new common_1.ForbiddenException('Session expired');
            }
            const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
            if (!isMatch) {
                this.invalidateSession({ session, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'Invalid refresh token during refresh' });
                throw new common_1.ForbiddenException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(session.uid, session.id, namespace);
            const newHash = await bcrypt.hash(tokens.refreshToken, 10);
            const newExpiry = new Date();
            const durationSeconds = (0, duration_util_1.parseDuration)(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
            newExpiry.setSeconds(newExpiry.getSeconds() + durationSeconds);
            await this.sessionRepository.update(session.id, {
                refreshTokenHash: newHash,
                expiresAt: newExpiry,
                ipAddress: currentIp ?? session.ipAddress,
            });
            if (this.eventEmitter) {
                this.eventEmitter.emit(auth_events_1.AuthEvents.TOKEN_REFRESHED, { uid: session.uid, tokens });
            }
            return tokens;
        }
        catch (e) {
            if (this.options.debug) {
                this.logger.error('Error refreshing tokens', e);
            }
            throw new common_1.ForbiddenException('Invalid request');
        }
    }
    async logout(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const payload = this.jwtService.decode(refreshToken);
            if (payload?.sessionId) {
                const session = await this.sessionRepository.findById(payload.sessionId);
                this.invalidateSession({ session, event: session_event_enum_1.SessionEvent.LOGOUT, reason: 'User logout' });
                if (session && this.eventEmitter) {
                    this.eventEmitter.emit(auth_events_1.AuthEvents.LOGOUT, { uid: session.uid });
                }
            }
        }
        catch (e) {
            if (this.options.debug) {
                this.logger.error('Error logging out', e);
            }
        }
    }
    // --- PASSWORD MANAGEMENT & SECURITY ---
    async forgotPassword(dto) {
        const value = dto.email || dto.phone || dto.username;
        if (!value)
            throw new common_1.BadRequestException('Identifier is required');
        const result = await this.authIdentifierRepo.findWithAuthByValue(value);
        if (!result) {
            return { message: 'If an account exists, a reset code has been sent.' };
        }
        const { identifier: primaryAuth, auth: primaryAuthObj } = result;
        const resetIdType = primaryAuth.type === 'PHONE' ? 'phone' : 'email';
        const issueResult = await this.resolveOtpProvider(resetIdType).issue({
            uid: primaryAuthObj.uid,
            authId: primaryAuthObj.id,
            identifier: primaryAuth.value,
            identifierType: resetIdType,
            purpose: otp_purpose_enum_1.OtpPurpose.PASSWORD_RESET,
            expiresIn: this.options.otpExpiresIn || 15
        });
        if (!issueResult.handledDelivery && this.notificationProvider && issueResult.code) {
            await this.notificationProvider.sendVerificationCode({
                to: primaryAuth.value,
                code: issueResult.code,
                type: primaryAuth.type === 'PHONE' ? 'phone' : 'email',
                purpose: otp_purpose_enum_1.OtpPurpose.PASSWORD_RESET,
                expiresAt: issueResult.expiresAt
            });
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.PASSWORD_RESET, { auth: primaryAuth });
        }
        return { message: 'If an account exists, a reset code has been sent.' };
    }
    async resetPassword(dto) {
        const result = await this.resolveOtpProvider().verify({ uid: dto.uid, code: dto.code, purpose: otp_purpose_enum_1.OtpPurpose.PASSWORD_RESET });
        if (!result.success || !result.authId) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const hash = await bcrypt.hash(dto.newPassword, 10);
        await this.authRepo.update(result.authId, {
            secretHash: hash,
            isActive: true // Unlock account on successful reset
        });
        // Security: Invalidate all sessions
        await this.invalidateSessions({ uid: dto.uid, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'User reset password' });
        if (this.eventEmitter) {
            const auth = await this.authRepo.findByUid(dto.uid);
            this.eventEmitter.emit(auth_events_1.AuthEvents.PASSWORD_RESET, { auth });
        }
        return { message: 'Password reset successful. All active sessions have been logged out.' };
    }
    async updatePassword(uid, dto, userAgent, ip) {
        // 1. Get primary LOCAL auth
        const auth = await this.authRepo.findByUidAndStrategies(uid, [auth_type_enum_1.AuthStrategy.LOCAL, auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME]);
        if (!auth || !auth.secretHash) {
            throw new common_1.BadRequestException('Password update only available for local accounts');
        }
        // 2. Verify current password
        const isMatch = await bcrypt.compare(dto.currentPassword, auth.secretHash);
        if (!isMatch)
            throw new common_1.BadRequestException('Incorrect current password');
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
                    purpose: otp_purpose_enum_1.OtpPurpose.SECURE_ACCOUNT,
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
            this.eventEmitter.emit(auth_events_1.AuthEvents.PASSWORD_UPDATED, { auth });
        }
        return { message: 'Password updated successfully' };
    }
    async secureAccount(dto) {
        const result = await this.resolveOtpProvider('email').verify({
            uid: dto.uid,
            code: dto.token,
            purpose: otp_purpose_enum_1.OtpPurpose.SECURE_ACCOUNT,
        });
        if (!result.success) {
            throw new common_1.BadRequestException('Invalid or expired security token');
        }
        // 1. Lock all auth methods
        const auths = await this.authRepo.findAllByUid(dto.uid);
        for (const auth of auths) {
            await this.authRepo.update(auth.id, { isActive: false });
        }
        // 2. Invalidate sessions
        this.invalidateSessions({ uid: dto.uid, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'User secured account by invalidating all sessions' });
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.ACCOUNT_SECURED, { uid: dto.uid });
        }
        return { message: 'Account secured and locked. Please reset your password to regain access.' };
    }
    // --- MAGIC LINK ---
    async requestMagicLink(dto) {
        const result = await this.authIdentifierRepo.findWithAuthByValue(dto.email.toLowerCase());
        if (!result) {
            // Optional: Auto-signup if not exists, but let's stick to existing for now
            throw new common_1.BadRequestException('No account found with this email');
        }
        const { auth: primaryAuthObj } = result;
        const issueResult = await this.resolveOtpProvider('email').issue({
            uid: primaryAuthObj.uid,
            authId: primaryAuthObj.id,
            identifier: dto.email.toLowerCase(),
            identifierType: 'email',
            purpose: otp_purpose_enum_1.OtpPurpose.MAGIC_LINK,
            expiresIn: 15
        });
        if (this.notificationProvider?.sendMagicLink && issueResult.code) {
            const link = `${this.options.frontendUrl || ''}/auth/magic-callback?token=${issueResult.code}&email=${dto.email}`;
            await this.notificationProvider.sendMagicLink(dto.email, link);
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.MAGIC_LINK_REQUESTED, { email: dto.email });
        }
        return { message: 'Magic link sent to your email.' };
    }
    async verifyMagicLink({ dto, userAgent, ip, namespace }) {
        const identifier = await this.authIdentifierRepo.findWithAuthByValue(dto.email.toLowerCase());
        if (!identifier)
            throw new common_1.BadRequestException('Identity not found');
        const result = await this.resolveOtpProvider('email').verify({
            uid: identifier.auth.uid,
            code: dto.token,
            purpose: otp_purpose_enum_1.OtpPurpose.MAGIC_LINK
        });
        if (!result.success || !result.authId) {
            throw new common_1.BadRequestException('Invalid or expired magic link');
        }
        const auth = await this.authRepo.findById(result.authId);
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.IDENTITY_VERIFIED, { auth, tokens });
        }
        return { tokens, auth };
    }
    // --- MFA (2FA) LOGIC ---
    async enrollMfa(uid, type) {
        if (type !== mfa_type_enum_1.MfaType.TOTP) {
            throw new common_1.BadRequestException('Currently only TOTP MFA is supported');
        }
        let mfa = await this.mfaRepo.findByUidAndType(uid, type);
        if (mfa?.isEnabled) {
            throw new common_1.BadRequestException('MFA is already enabled for this account');
        }
        const secret = otplib_1.authenticator.generateSecret();
        const appName = this.options.appName || 'NestJS Auth';
        const otpauth = otplib_1.authenticator.keyuri(uid, appName, secret);
        if (!mfa) {
            mfa = await this.mfaRepo.create({
                uid,
                type,
                secret,
                isEnabled: false,
            });
        }
        else {
            mfa.secret = secret;
        }
        await this.mfaRepo.save(mfa);
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.MFA_ENROLLED, { uid, type });
        }
        return { secret, otpauth };
    }
    async activateMfa(uid, type, code) {
        const mfa = await this.mfaRepo.findByUidAndType(uid, type);
        if (!mfa) {
            throw new common_1.BadRequestException('No MFA enrollment found');
        }
        if (mfa.isEnabled) {
            throw new common_1.BadRequestException('MFA is already enabled');
        }
        const isValid = otplib_1.authenticator.verify({
            token: code,
            secret: mfa.secret,
        });
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid MFA code');
        }
        mfa.isEnabled = true;
        mfa.isDefault = true;
        await this.mfaRepo.save(mfa);
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.MFA_ACTIVATED, { uid, type });
        }
        return { message: 'MFA activated successfully' };
    }
    async mfaLogin(uid, code, userAgent, ip, namespace) {
        const auth = await this.authRepo.findByUid(uid);
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        const mfa = await this.mfaRepo.findByUidAndEnabled(uid);
        if (!mfa)
            throw new common_1.BadRequestException('MFA is not enabled for this account');
        const isValid = otplib_1.authenticator.verify({
            token: code,
            secret: mfa.secret,
        });
        if (!isValid)
            throw new common_1.BadRequestException('Invalid MFA code');
        const { secretHash, ...filteredAuth } = auth;
        const tokens = await this.createSession(auth.uid, userAgent, ip, namespace);
        if (this.eventEmitter) {
            this.eventEmitter.emit(auth_events_1.AuthEvents.LOGIN, { auth: filteredAuth, tokens });
        }
        return { message: 'Login successful', tokens, auth: filteredAuth };
    }
    async viewAll() {
        const auths = await this.authRepo.findAll();
        return auth_mapper_1.AuthMapper.toDtoList(auths);
    }
    async me(uid) {
        const auths = await this.authRepo.findAllByUid(uid);
        return auth_mapper_1.AuthMapper.toDto(auths[0]);
    }
    async viewAllMyAuthMethods(uid) {
        const auths = await this.authRepo.findAllByUid(uid);
        return auth_mapper_1.AuthMapper.toDtoList(auths);
    }
    async deleteAccount(uid) {
        // 1. Delete all sessions for this UID
        await this.invalidateSessions({ uid, event: session_event_enum_1.SessionEvent.DELETE, reason: 'User deleted account' });
        // 2. Delete all MFA methods for this UID
        await this.mfaRepo.deleteByUid(uid);
        // 3. Delete all Auth methods for this UID. 
        await this.authRepo.deleteByUid(uid);
    }
    async deleteAuthMethod(uid, authId) {
        const auth = await this.authRepo.findById(authId);
        if (!auth || auth.uid !== uid) {
            throw new common_1.BadRequestException('Authentication method not found or does not belong to user');
        }
        // Check if this is the last auth method
        const allAuths = await this.authRepo.findAllByUid(uid);
        if (allAuths.length <= 1) {
            throw new common_1.BadRequestException('Cannot delete the last authentication method. Delete account instead.');
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
    async getSessions({ uid, namespace }) {
        const sessions = await this.sessionRepository.findByUid(uid);
        if (namespace !== undefined) {
            return sessions.filter(s => s.namespace === namespace);
        }
        return sessions;
    }
    async getSession(id) {
        return this.sessionRepository.findById(id);
    }
    async revokeSession({ sessionId }) {
        await this.invalidateSession({ sessionId, event: session_event_enum_1.SessionEvent.REVOKE, reason: 'User requested session revoke' });
    }
    async getSessionLogs({ uid, namespace }) {
        return this.sessionLogRepo.findByUidAndNamespace(uid, namespace);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(2, (0, common_1.Optional)()),
    __param(3, (0, common_1.Inject)(repository_tokens_1.SESSION_REPOSITORY_TOKEN)),
    __param(4, (0, common_1.Inject)(repository_tokens_1.SESSION_LOG_REPOSITORY_TOKEN)),
    __param(5, (0, common_1.Inject)(repository_tokens_1.AUTH_REPOSITORY_TOKEN)),
    __param(6, (0, common_1.Inject)(repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN)),
    __param(7, (0, common_1.Inject)(auth_otp_provider_interface_1.AUTH_OTP_PROVIDER)),
    __param(8, (0, common_1.Inject)(auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_EMAIL)),
    __param(9, (0, common_1.Inject)(auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_PHONE)),
    __param(10, (0, common_1.Inject)(repository_tokens_1.MFA_METHOD_REPOSITORY_TOKEN)),
    __param(11, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __param(12, (0, common_1.Optional)()),
    __param(12, (0, common_1.Inject)(auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER)),
    __param(13, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        local_auth_strategy_1.LocalAuthStrategy,
        oauth_strategy_1.OAuthAuthStrategy, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, event_emitter_1.EventEmitter2])
], AuthService);
//# sourceMappingURL=auth.service.js.map
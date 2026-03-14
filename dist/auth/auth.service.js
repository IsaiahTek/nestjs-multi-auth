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
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const local_auth_strategy_1 = require("./strategies/local-auth.strategy");
const oauth_strategy_1 = require("./strategies/oauth/oauth.strategy");
const auth_type_enum_1 = require("./auth-type.enum");
const auth_entity_1 = require("./entities/auth.entity");
const session_entity_1 = require("./entities/session.entity");
const otp_token_entity_1 = require("./entities/otp-token.entity");
const mfa_method_entity_1 = require("./entities/mfa-method.entity");
const otplib_1 = require("otplib");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const crypto = require("crypto");
const duration_util_1 = require("./utils/duration.util");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, passwordStrategy, oauthStrategy, sessionRepository, authRepo, otpRepo, mfaRepo, options, notificationProvider) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.oauthStrategy = oauthStrategy;
        this.sessionRepository = sessionRepository;
        this.authRepo = authRepo;
        this.otpRepo = otpRepo;
        this.mfaRepo = mfaRepo;
        this.options = options;
        this.notificationProvider = notificationProvider;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    // --- INTERNAL HELPER: Generate Token Pair ---
    async generateTokens(uid, sessionId) {
        const refreshJti = crypto.randomUUID();
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: uid, sessionId }, {
                secret: this.options.jwtSecret || process.env.JWT_SECRET,
                expiresIn: (this.options.accessTokenExpiresIn || '15m'),
            }),
            this.jwtService.signAsync({ sub: uid, sessionId, jti: refreshJti }, {
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
    async createSession(uid, userAgent = 'Unknown', ip = 'Unknown') {
        const expiresAt = new Date();
        const durationSeconds = (0, duration_util_1.parseDuration)(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
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
    async signup(dto, uid, userAgent, ip) {
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
        const mfaMethod = await this.mfaRepo.findOne({ where: { uid: auth.uid, isEnabled: true } });
        const has2FA = !!mfaMethod;
        const triggerVerification = isPasswordless ||
            (this.options.verificationRequired && !identifier?.isVerified) ||
            has2FA;
        const { secretHash, ...filteredAuth } = auth;
        if (triggerVerification && this.notificationProvider) {
            if (!identifier?.isVerified || has2FA || isPasswordless) {
                await this.sendVerification(auth, identifier);
            }
            return {
                message: isPasswordless ? 'Passwordless signup: Verification code sent.' : 'Signup successful. Please verify your identity.',
                auth: filteredAuth,
                verificationRequired: true
            };
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { ...tokens, auth: filteredAuth };
    }
    async login(dto, userAgent, ip) {
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
        // Force verification if no password was provided for local strategies (passwordless login)
        const isPasswordless = [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(dto.method) && !dto.password;
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
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { ...tokens, auth: filteredAuth };
    }
    // --- VERIFICATION LOGIC ---
    async sendVerification(auth, currentIdentifier) {
        if (!this.notificationProvider)
            return;
        // 1. Determine primary identifier (email or phone) to send the code to
        // If we have a verified email/phone on the same UID, use that.
        // Otherwise use the current identifier if it's verifiable.
        let primaryIdentifier = currentIdentifier?.type !== 'USERNAME' ? currentIdentifier : null;
        if (!primaryIdentifier) {
            // Look for any EMAIL or PHONE linked to this UID
            const allIdentifiers = await this.authRepo.query(`SELECT ai.* FROM auth_identifiers ai 
         JOIN auth a ON ai."authId" = a.id 
         WHERE a.uid = $1 AND ai.type IN ('EMAIL', 'PHONE')
         ORDER BY ai."isVerified" DESC, ai."createdAt" ASC LIMIT 1`, [auth.uid]);
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
            purpose: primaryIdentifier.type === 'EMAIL' ? otp_token_entity_1.OtpPurpose.VERIFY_EMAIL : otp_token_entity_1.OtpPurpose.VERIFY_PHONE,
            codeHash: hash,
            expiresAt,
            requestUserId: auth.uid,
            requestAuthId: auth.id,
        });
        await this.otpRepo.save(otpToken);
        // 4. Send via Provider
        try {
            await this.notificationProvider.sendVerificationCode(primaryIdentifier.value, code, primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone');
        }
        catch (e) {
            this.logger.error(`Failed to send verification code to ${primaryIdentifier.value}`, e);
            throw new common_1.BadRequestException('Failed to send verification code');
        }
    }
    async verifyCode(uid, code, userAgent, ip) {
        const auth = await this.authRepo.findOne({ where: { uid } });
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        // Find the latest unused OTP for this UID
        const otp = await this.otpRepo.findOne({
            where: { requestUserId: uid, isUsed: false },
            order: { createdAt: 'DESC' },
        });
        if (!otp) {
            if (auth.isVerified)
                return { message: 'Identity already verified' };
            throw new common_1.BadRequestException('No verification code found');
        }
        if (new Date() > otp.expiresAt) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        const isMatch = await bcrypt.compare(code, otp.codeHash);
        if (!isMatch)
            throw new common_1.BadRequestException('Invalid verification code');
        // Success!
        otp.isUsed = true;
        await this.otpRepo.save(otp);
        auth.isVerified = true;
        await this.authRepo.save(auth);
        // Also mark all identifiers for this Auth as verified
        await this.authRepo.query(`UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`, [auth.id]);
        // If there's a requestAuthId on the OTP (which there should be), update that one too if different
        if (otp.requestAuthId && otp.requestAuthId !== auth.id) {
            await this.authRepo.update(otp.requestAuthId, { isVerified: true });
            await this.authRepo.query(`UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`, [otp.requestAuthId]);
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { message: 'Identity verified successfully', tokens, auth };
    }
    async resendVerification(uid) {
        const auth = await this.authRepo.findOne({ where: { uid } });
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        if (!this.notificationProvider) {
            throw new common_1.BadRequestException('Verification is not configured');
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
                throw new common_1.BadRequestException(`Please wait ${wait} seconds before requesting a new code.`);
            }
        }
        await this.sendVerification(auth);
        return { message: 'Verification code resent' };
    }
    async refreshTokens(refreshToken, currentUserAgent, currentIp) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, { secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET });
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
            if (!session)
                throw new common_1.ForbiddenException('Session not found');
            const incomingFingerprint = this.fingerprint(currentUserAgent);
            if (session.deviceFingerprint !== incomingFingerprint) {
                await this.sessionRepository.delete(session.id);
                throw new common_1.ForbiddenException('Device mismatch');
            }
            if (new Date() > session.expiresAt) {
                await this.sessionRepository.delete(session.id);
                throw new common_1.ForbiddenException('Session expired');
            }
            const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
            if (!isMatch) {
                await this.sessionRepository.delete(session.id);
                throw new common_1.ForbiddenException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(session.uid, session.id);
            const newHash = await bcrypt.hash(tokens.refreshToken, 10);
            const newExpiry = new Date();
            const durationSeconds = (0, duration_util_1.parseDuration)(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
            newExpiry.setSeconds(newExpiry.getSeconds() + durationSeconds);
            await this.sessionRepository.update(session.id, {
                refreshTokenHash: newHash,
                expiresAt: newExpiry,
                ipAddress: currentIp ?? session.ipAddress,
            });
            return tokens;
        }
        catch (e) {
            this.logger.error('Error refreshing tokens', e);
            throw new common_1.ForbiddenException('Invalid request');
        }
    }
    async logout(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const payload = this.jwtService.decode(refreshToken);
            if (payload?.sessionId) {
                await this.sessionRepository.delete(payload.sessionId);
            }
        }
        catch (e) {
            this.logger.error('Error logging out', e);
        }
    }
    // --- MFA (2FA) LOGIC ---
    async enrollMfa(uid, type) {
        if (type !== mfa_method_entity_1.MfaType.TOTP) {
            throw new common_1.BadRequestException('Currently only TOTP MFA is supported');
        }
        let mfa = await this.mfaRepo.findOne({ where: { uid, type }, select: ['id', 'secret', 'isEnabled', 'type'] });
        if (mfa?.isEnabled) {
            throw new common_1.BadRequestException('MFA is already enabled for this account');
        }
        const secret = otplib_1.authenticator.generateSecret();
        const appName = this.options.appName || 'NestJS Auth';
        const otpauth = otplib_1.authenticator.keyuri(uid, appName, secret);
        if (!mfa) {
            mfa = this.mfaRepo.create({
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
        return {
            secret,
            otpauth,
        };
    }
    async activateMfa(uid, type, code) {
        const mfa = await this.mfaRepo.findOne({
            where: { uid, type },
            select: ['id', 'secret', 'isEnabled']
        });
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
        return { message: 'MFA activated successfully' };
    }
    async viewAll() {
        const auths = await this.authRepo.find({ relations: ['identifiers', 'oauthProvider'] });
        return auths;
    }
    async viewAllMyAuthMethods(uid) {
        const auths = await this.authRepo.find({ where: { uid } });
        return auths;
    }
    async deleteAccount(uid) {
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
    async deleteAuthMethod(uid, authId) {
        const auth = await this.authRepo.findOne({ where: { id: authId, uid } });
        if (!auth) {
            throw new common_1.BadRequestException('Authentication method not found or does not belong to user');
        }
        // Check if this is the last auth method
        const count = await this.authRepo.count({ where: { uid } });
        if (count <= 1) {
            throw new common_1.BadRequestException('Cannot delete the last authentication method. Delete account instead.');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(2, (0, common_1.Optional)()),
    __param(3, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(4, (0, typeorm_1.InjectRepository)(auth_entity_1.Auth)),
    __param(5, (0, typeorm_1.InjectRepository)(otp_token_entity_1.OtpToken)),
    __param(6, (0, typeorm_1.InjectRepository)(mfa_method_entity_1.MfaMethod)),
    __param(7, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __param(8, (0, common_1.Optional)()),
    __param(8, (0, common_1.Inject)(auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        local_auth_strategy_1.LocalAuthStrategy,
        oauth_strategy_1.OAuthAuthStrategy,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
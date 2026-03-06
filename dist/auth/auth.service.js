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
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const crypto_1 = require("crypto");
const crypto = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, passwordStrategy, oauthStrategy, sessionRepository, authRepo, otpRepo, options, notificationProvider) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.oauthStrategy = oauthStrategy;
        this.sessionRepository = sessionRepository;
        this.authRepo = authRepo;
        this.otpRepo = otpRepo;
        this.options = options;
        this.notificationProvider = notificationProvider;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    // --- INTERNAL HELPER: Generate Token Pair ---
    async generateTokens(uid, sessionId) {
        const refreshJti = (0, crypto_1.randomUUID)();
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
    parseDuration(duration, defaultSeconds) {
        if (typeof duration === 'number')
            return duration;
        if (!duration)
            return defaultSeconds;
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match)
            return defaultSeconds;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 60 * 60 * 24;
            default: return defaultSeconds;
        }
    }
    fingerprint(userAgent) {
        return crypto.createHash('sha256').update(userAgent).digest('hex');
    }
    // --- INTERNAL HELPER: Create/Update Session in DB ---
    async createSession(uid, userAgent = 'Unknown', ip = 'Unknown') {
        const expiresAt = new Date();
        const durationSeconds = this.parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
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
    async signup(dto, userAgent, ip) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.EMAIL:
            case auth_type_enum_1.AuthStrategy.PHONE:
            case auth_type_enum_1.AuthStrategy.USERNAME:
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                auth = await this.passwordStrategy.registerCredentials(dto);
                break;
            case auth_type_enum_1.AuthStrategy.GOOGLE:
            case auth_type_enum_1.AuthStrategy.FACEBOOK:
            case auth_type_enum_1.AuthStrategy.APPLE:
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                auth = await this.oauthStrategy.registerCredentials(dto);
                break;
            default:
                throw new Error('Unsupported signup provider');
        }
        // Force verification if no password was provided for local strategies (passwordless signup)
        const isPasswordless = [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(dto.method) && !dto.password;
        if ((this.options.verificationRequired || isPasswordless) && this.notificationProvider) {
            if (!auth.isVerified) {
                await this.sendVerification(auth);
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
    async login(dto, userAgent, ip) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.EMAIL:
            case auth_type_enum_1.AuthStrategy.PHONE:
            case auth_type_enum_1.AuthStrategy.USERNAME:
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                auth = await this.passwordStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.GOOGLE:
            case auth_type_enum_1.AuthStrategy.FACEBOOK:
            case auth_type_enum_1.AuthStrategy.APPLE:
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                auth = await this.oauthStrategy.login(dto);
                break;
            default:
                throw new Error('Unsupported login provider');
        }
        // Force verification if no password was provided for local strategies (passwordless login)
        const isPasswordless = [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(dto.method) && !dto.password;
        if ((this.options.verificationRequired || isPasswordless) && !auth.isVerified && this.notificationProvider) {
            await this.sendVerification(auth);
            return {
                message: isPasswordless ? 'Passwordless login: Verification code sent.' : 'Identity verification required.',
                auth,
                verificationRequired: true
            };
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { ...tokens, auth };
    }
    // --- VERIFICATION LOGIC ---
    async sendVerification(auth) {
        if (!this.notificationProvider)
            return;
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
        const otpExpMins = this.options.otpExpiresIn || 15;
        expiresAt.setMinutes(expiresAt.getMinutes() + otpExpMins);
        const otpToken = this.otpRepo.create({
            identifier: primaryIdentifier.value,
            purpose: primaryIdentifier.type === 'EMAIL' ? otp_token_entity_1.OtpPurpose.VERIFY_EMAIL : otp_token_entity_1.OtpPurpose.VERIFY_PHONE,
            codeHash: hash,
            expiresAt,
            requestUserId: auth.uid,
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
        if (auth.isVerified)
            return { message: 'Identity already verified' };
        // Find the latest unused OTP for this UID
        const otp = await this.otpRepo.findOne({
            where: { requestUserId: uid, isUsed: false },
            order: { createdAt: 'DESC' },
        });
        if (!otp)
            throw new common_1.BadRequestException('No verification code found');
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
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { message: 'Identity verified successfully', tokens, auth };
    }
    async resendVerification(uid) {
        const auth = await this.authRepo.findOne({ where: { uid } });
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        if (auth.isVerified)
            throw new common_1.BadRequestException('Identity already verified');
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
            const durationSeconds = this.parseDuration(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60);
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(2, (0, common_1.Optional)()),
    __param(3, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(4, (0, typeorm_1.InjectRepository)(auth_entity_1.Auth)),
    __param(5, (0, typeorm_1.InjectRepository)(otp_token_entity_1.OtpToken)),
    __param(6, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __param(7, (0, common_1.Optional)()),
    __param(7, (0, common_1.Inject)(auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        local_auth_strategy_1.LocalAuthStrategy,
        oauth_strategy_1.OAuthAuthStrategy,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
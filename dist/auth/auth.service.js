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
const otp_strategy_1 = require("./strategies/otp.strategy");
const auth_type_enum_1 = require("./auth-type.enum");
const auth_entity_1 = require("./entities/auth.entity");
const session_entity_1 = require("./entities/session.entity");
const otp_token_entity_1 = require("./entities/otp-token.entity");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const crypto_1 = require("crypto");
const crypto = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, passwordStrategy, oauthStrategy, otpStrategy, sessionRepository, authRepo, otpRepo, options, notificationProvider) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.oauthStrategy = oauthStrategy;
        this.otpStrategy = otpStrategy;
        this.sessionRepository = sessionRepository;
        this.authRepo = authRepo;
        this.otpRepo = otpRepo;
        this.options = options;
        this.notificationProvider = notificationProvider;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async generateTokens(uid, sessionId) {
        const refreshJti = (0, crypto_1.randomUUID)();
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: uid, sessionId }, {
                secret: this.options.jwtSecret || process.env.JWT_SECRET,
                expiresIn: (this.options.jwtExpiresIn || '15m'),
            }),
            this.jwtService.signAsync({ sub: uid, sessionId, jti: refreshJti }, {
                secret: this.options.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET,
                expiresIn: (this.options.jwtRefreshExpiresIn || '7d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    fingerprint(userAgent) {
        return crypto.createHash('sha256').update(userAgent).digest('hex');
    }
    async createSession(uid, userAgent = 'Unknown', ip = 'Unknown') {
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
    async signup(dto, userAgent, ip) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || [
            auth_type_enum_1.AuthStrategy.LOCAL,
            auth_type_enum_1.AuthStrategy.OAUTH,
            auth_type_enum_1.AuthStrategy.OTP,
        ];
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                auth = await this.passwordStrategy.registerCredentials(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                auth = await this.oauthStrategy.registerCredentials(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OTP:
                if (!this.otpStrategy)
                    throw new common_1.BadRequestException('OTP authentication is not configured.');
                auth = await this.otpStrategy.registerCredentials(dto);
                break;
            default:
                throw new Error('Unsupported signup provider');
        }
        if (this.notificationProvider) {
            await this.sendVerification(auth);
        }
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
    async login(dto, userAgent, ip) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        const enabledStrategies = this.options.enabledStrategies || [
            auth_type_enum_1.AuthStrategy.LOCAL,
            auth_type_enum_1.AuthStrategy.OAUTH,
            auth_type_enum_1.AuthStrategy.OTP,
        ];
        if (!enabledStrategies.includes(dto.method)) {
            throw new common_1.BadRequestException(`Authentication method ${dto.method} is currently disabled.`);
        }
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                if (!this.passwordStrategy)
                    throw new common_1.BadRequestException('Local authentication is not configured.');
                auth = await this.passwordStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                if (!this.oauthStrategy)
                    throw new common_1.BadRequestException('OAuth authentication is not configured.');
                auth = await this.oauthStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OTP:
                if (!this.otpStrategy)
                    throw new common_1.BadRequestException('OTP authentication is not configured.');
                auth = await this.otpStrategy.login(dto);
                break;
            default:
                throw new Error('Unsupported login provider');
        }
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
    async sendVerification(auth) {
        if (!this.notificationProvider)
            return;
        let primaryIdentifier = auth.identifiers?.find(id => id.type === 'EMAIL' || id.type === 'PHONE');
        if (!primaryIdentifier) {
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
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hash = await bcrypt.hash(code, 10);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        const otpToken = this.otpRepo.create({
            identifier: primaryIdentifier.value,
            purpose: primaryIdentifier.type === 'EMAIL' ? otp_token_entity_1.OtpPurpose.VERIFY_EMAIL : otp_token_entity_1.OtpPurpose.VERIFY_PHONE,
            codeHash: hash,
            expiresAt,
            requestUserId: auth.uid,
        });
        await this.otpRepo.save(otpToken);
        try {
            await this.notificationProvider.sendVerificationCode(primaryIdentifier.value, code, primaryIdentifier.type === 'EMAIL' ? 'email' : 'phone');
        }
        catch (e) {
            this.logger.error(`Failed to send verification code to ${primaryIdentifier.value}`, e);
            throw new common_1.BadRequestException('Failed to send verification code');
        }
    }
    async verifyCode(uid, code) {
        const auth = await this.authRepo.findOne({ where: { uid } });
        if (!auth)
            throw new common_1.BadRequestException('Identity not found');
        if (auth.isVerified)
            return { message: 'Identity already verified' };
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
        otp.isUsed = true;
        await this.otpRepo.save(otp);
        auth.isVerified = true;
        await this.authRepo.save(auth);
        return { message: 'Identity verified successfully' };
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
            newExpiry.setDate(newExpiry.getDate() + 7);
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
    __param(3, (0, common_1.Optional)()),
    __param(4, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(5, (0, typeorm_1.InjectRepository)(auth_entity_1.Auth)),
    __param(6, (0, typeorm_1.InjectRepository)(otp_token_entity_1.OtpToken)),
    __param(7, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __param(8, (0, common_1.Optional)()),
    __param(8, (0, common_1.Inject)(auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        local_auth_strategy_1.LocalAuthStrategy,
        oauth_strategy_1.OAuthAuthStrategy,
        otp_strategy_1.OtpAuthStrategy,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
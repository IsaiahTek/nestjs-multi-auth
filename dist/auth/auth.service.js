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
const password_strategy_1 = require("./strategies/password.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const otp_strategy_1 = require("./strategies/otp.strategy");
const auth_type_enum_1 = require("./auth-type.enum");
const auth_entity_1 = require("./entities/auth.entity");
const session_entity_1 = require("./entities/session.entity");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
const crypto = require("crypto");
const common_2 = require("@nestjs/common");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, passwordStrategy, googleStrategy, otpStrategy, sessionRepository, authRepo, options) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.googleStrategy = googleStrategy;
        this.otpStrategy = otpStrategy;
        this.sessionRepository = sessionRepository;
        this.authRepo = authRepo;
        this.options = options;
        this.logger = new common_2.Logger(AuthService_1.name);
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
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                auth = await this.passwordStrategy.registerCredentials(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                auth = await this.googleStrategy.registerCredentials(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OTP:
                auth = await this.otpStrategy.registerCredentials(dto);
                break;
            default:
                throw new Error('Unsupported signup provider');
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { ...tokens, auth };
    }
    async login(dto, userAgent, ip) {
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        let auth;
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                auth = await this.passwordStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                auth = await this.googleStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OTP:
                auth = await this.otpStrategy.login(dto);
                break;
            default:
                throw new Error('Unsupported login provider');
        }
        const tokens = await this.createSession(auth.uid, userAgent, ip);
        return { ...tokens, auth };
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
    __param(4, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(5, (0, typeorm_1.InjectRepository)(auth_entity_1.Auth)),
    __param(6, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        password_strategy_1.PasswordAuthStrategy,
        google_strategy_1.GoogleAuthStrategy,
        otp_strategy_1.OtpAuthStrategy,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
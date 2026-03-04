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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const password_strategy_1 = require("./strategies/password.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const auth_type_enum_1 = require("./auth-type.enum");
const session_entity_1 = require("./entities/session.entity");
const auth_user_service_interface_1 = require("./interfaces/auth-user-service.interface");
const crypto_1 = require("crypto");
const crypto = require("crypto");
let AuthService = class AuthService {
    constructor(jwtService, passwordStrategy, googleStrategy, sessionRepository, authUserService) {
        this.jwtService = jwtService;
        this.passwordStrategy = passwordStrategy;
        this.googleStrategy = googleStrategy;
        this.sessionRepository = sessionRepository;
        this.authUserService = authUserService;
    }
    async generateTokens(userId, sessionId) {
        const payload = { sub: userId, sessionId };
        const refreshJti = (0, crypto_1.randomUUID)();
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, sessionId }, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '15m',
            }),
            this.jwtService.signAsync({ ...payload, jti: refreshJti }, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '7d',
            }),
        ]);
        return { accessToken, refreshToken };
    }
    fingerprint(userAgent) {
        return crypto.createHash('sha256').update(userAgent).digest('hex');
    }
    async createSession(userId, userAgent = 'Unknown', ip = 'Unknown') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const deviceFingerprint = this.fingerprint(userAgent);
        const session = this.sessionRepository.create({
            userId,
            deviceFingerprint,
            ipAddress: ip,
            expiresAt,
            refreshTokenHash: '',
        });
        await this.sessionRepository.save(session);
        const tokens = await this.generateTokens(userId, session.id);
        const hash = await bcrypt.hash(tokens.refreshToken, 10);
        await this.sessionRepository.update(session.id, { refreshTokenHash: hash });
        return tokens;
    }
    async signup(dto, userAgent, ip) {
        let auth;
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                auth = await this.passwordStrategy.signup(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                auth = await this.googleStrategy.signup(dto);
                break;
            default:
                throw new Error('Unsupported signup provider');
        }
        const tokens = await this.createSession(auth.userId, userAgent, ip);
        const user = await this.authUserService.findById(auth.userId);
        return { ...tokens, user };
    }
    async login(dto, userAgent, ip) {
        let auth;
        if (!dto.method)
            throw new common_1.BadRequestException('Method is required');
        switch (dto.method) {
            case auth_type_enum_1.AuthStrategy.LOCAL:
                auth = await this.passwordStrategy.login(dto);
                break;
            case auth_type_enum_1.AuthStrategy.OAUTH:
                auth = await this.googleStrategy.login(dto);
                break;
            default:
                throw new Error('Unsupported login provider');
        }
        const tokens = await this.createSession(auth.userId, userAgent, ip);
        const user = await this.authUserService.findById(auth.userId);
        return { ...tokens, user };
    }
    async refreshTokens(refreshToken, currentUserAgent, currentIp) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
            const session = await this.sessionRepository.findOne({
                where: { id: payload.sessionId },
                select: [
                    'id',
                    'refreshTokenHash',
                    'expiresAt',
                    'deviceFingerprint',
                    'ipAddress',
                ],
                relations: ['user'],
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
            const tokens = await this.generateTokens(session.userId, session.id);
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
            console.log('Error refreshing tokens', e);
            throw new common_1.ForbiddenException('Invalid request');
        }
    }
    async logout(refreshToken) {
        if (!refreshToken)
            return;
        try {
            const payload = this.jwtService.decode(refreshToken);
            if (payload && payload.sessionId) {
                await this.sessionRepository.delete(payload.sessionId);
            }
        }
        catch (e) {
            console.log('Error logging out', e);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(4, (0, common_1.Inject)(auth_user_service_interface_1.AUTH_USER_SERVICE)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        password_strategy_1.PasswordAuthStrategy,
        google_strategy_1.GoogleAuthStrategy,
        typeorm_2.Repository, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
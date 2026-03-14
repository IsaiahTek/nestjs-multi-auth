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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const signup_dto_1 = require("./dto/signup.dto");
const verify_dto_1 = require("./dto/verify.dto");
const mfa_dto_1 = require("./dto/mfa.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("./decorator/public.decorator");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_type_enum_1 = require("./auth-type.enum");
const duration_util_1 = require("./utils/duration.util");
const optional_decorator_1 = require("./decorator/optional.decorator");
let AuthController = class AuthController {
    constructor(authService, options) {
        this.authService = authService;
        this.options = options;
    }
    getTransports() {
        const t = this.options.transport || [auth_type_enum_1.AuthTransport.BEARER];
        return Array.isArray(t) ? t : [t];
    }
    getDynamicPath(req) {
        const baseUrl = req.originalUrl.split('?')[0];
        const lastSlashIndex = baseUrl.lastIndexOf('/');
        return baseUrl.substring(0, lastSlashIndex) + '/refresh';
    }
    setCookies(res, req, accessToken, refreshToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        const refreshPath = this.getDynamicPath(req);
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: refreshPath,
            maxAge: (0, duration_util_1.parseDuration)(this.options.refreshTokenExpiresIn || '7d', 7 * 24 * 60 * 60) * 1000,
        });
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: (0, duration_util_1.parseDuration)(this.options.accessTokenExpiresIn || '15m', 15 * 60) * 1000,
        });
    }
    async signup(dto, res, req) {
        try {
            const result = await this.authService.signup(dto, undefined, req.headers['user-agent'], req.ip);
            const transports = this.getTransports();
            if ('accessToken' in result) {
                if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                    this.setCookies(res, req, result.accessToken, result.refreshToken);
                }
            }
            const response = { message: result.message || 'Signup successful', auth: result.auth };
            if (result.verificationRequired)
                response.verificationRequired = true;
            if ('accessToken' in result && (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH))) {
                response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
            }
            return response;
        }
        catch (e) {
            throw new common_1.HttpException(e.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async login(dto, res, req) {
        try {
            const result = await this.authService.login(dto, req.headers['user-agent'], req.ip);
            const transports = this.getTransports();
            if ('accessToken' in result) {
                if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                    this.setCookies(res, req, result.accessToken, result.refreshToken);
                }
            }
            const response = { message: result.message || 'Login successful', auth: result.auth };
            if (result.verificationRequired)
                response.verificationRequired = true;
            console.log("RESPONSE IN CONTROLLER: ", response);
            if ('accessToken' in result && (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH))) {
                response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
            }
            return response;
        }
        catch (e) {
            throw new common_1.HttpException(e.message, common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async verify(dto, res, req) {
        const result = await this.authService.verifyCode(dto.uid, dto.code, req.headers['user-agent'], req.ip);
        const transports = this.getTransports();
        if (result.tokens) {
            if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                this.setCookies(res, req, result.tokens.accessToken, result.tokens.refreshToken);
            }
        }
        const response = { message: result.message, auth: result.auth };
        if (result.tokens && (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH))) {
            response.tokens = result.tokens;
        }
        return response;
    }
    async resendVerification(dto) {
        return this.authService.resendVerification(dto.uid);
    }
    async link(dto, req, res) {
        try {
            const result = await this.authService.signup(dto, req.user.uid, req.headers['user-agent'], req.ip);
            const transports = this.getTransports();
            if ('accessToken' in result) {
                if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                    this.setCookies(res, req, result.accessToken, result.refreshToken);
                }
            }
            const response = { message: result.message || 'Method linked successfully', auth: result.auth };
            if (result.verificationRequired)
                response.verificationRequired = true;
            if ('accessToken' in result && (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH))) {
                response.tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
            }
            return response;
        }
        catch (e) {
            throw new common_1.HttpException(e.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async refresh(req, res, dto) {
        const transports = this.getTransports();
        let token = req.cookies?.['refresh_token'] || dto.refreshToken;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token)
            throw new common_1.BadRequestException('Refresh token is required');
        try {
            const tokens = await this.authService.refreshTokens(token, req.headers['user-agent'] || '', req.ip);
            if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                this.setCookies(res, req, tokens.accessToken, tokens.refreshToken);
            }
            if (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                return { message: 'Token refreshed', tokens };
            }
            return { message: 'Token refreshed' };
        }
        catch (e) {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token', { path: this.getDynamicPath(req) });
            throw new common_1.HttpException('Invalid session', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async enrollMfa(req, dto) {
        return this.authService.enrollMfa(req.user.uid, dto.type);
    }
    async activateMfa(req, dto) {
        return this.authService.activateMfa(req.user.uid, dto.type, dto.code);
    }
    async logout(req, res, dto) {
        let token = req.cookies?.['refresh_token'] || dto.refreshToken;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        await this.authService.logout(token);
        res.clearCookie('access_token');
        res.clearCookie('refresh_token', { path: this.getDynamicPath(req) });
        return { message: 'Logged out successfully' };
    }
    async all() {
        return this.authService.viewAll();
    }
    async viewAll(req) {
        return this.authService.viewAllMyAuthMethods(req.user.uid);
    }
    async deleteAccount(req, res) {
        await this.authService.deleteAccount(req.user.uid);
        res.clearCookie('access_token');
        res.clearCookie('refresh_token', { path: this.getDynamicPath(req) });
        return { message: 'Account deleted successfully' };
    }
    async deleteAuthMethod(req, authId) {
        return this.authService.deleteAuthMethod(req.user.uid, authId);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'User signup' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('signin'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'User login' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify identity with OTP code' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_dto_1.VerifyDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Resend verification code' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('link'),
    (0, swagger_1.ApiOperation)({ summary: 'Link new auth method to current account' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "link", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('mfa/enroll'),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll in MFA (e.g., TOTP)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mfa_dto_1.EnrollMfaDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "enrollMfa", null);
__decorate([
    (0, common_1.Post)('mfa/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate MFA after enrollment' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mfa_dto_1.ActivateMfaDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "activateMfa", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, swagger_1.ApiOperation)({ summary: 'User logout' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, optional_decorator_1.OptionalAuth)(),
    (0, common_1.Get)(''),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "all", null);
__decorate([
    (0, common_1.Get)('view-all'),
    (0, swagger_1.ApiOperation)({ summary: 'View all authentication methods' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "viewAll", null);
__decorate([
    (0, common_1.Delete)('account'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete user account and all associated data' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Delete)('method/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a specific authentication method' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteAuthMethod", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(1, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [auth_service_1.AuthService, Object])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
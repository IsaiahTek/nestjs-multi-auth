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
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const signup_dto_1 = require("./dto/signup.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("./decorator/public.decorator");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const auth_type_enum_1 = require("./auth-type.enum");
let AuthController = class AuthController {
    constructor(authService, options) {
        this.authService = authService;
        this.options = options;
    }
    getDynamicPath(req) {
        const baseUrl = req.originalUrl.split('?')[0];
        const lastSlashIndex = baseUrl.lastIndexOf('/');
        const basePath = baseUrl.substring(0, lastSlashIndex);
        const dynamicRefreshPath = `${basePath}/refresh`;
        return dynamicRefreshPath;
    }
    setCookies(res, req, accessToken, refreshToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        const dynamicRefreshPath = this.getDynamicPath(req);
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: dynamicRefreshPath,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 15 * 60 * 1000,
        });
    }
    async signup(dto, res, req) {
        try {
            const userAgent = req.headers['user-agent'];
            const ip = req.ip;
            const result = await this.authService.signup(dto, userAgent, ip);
            const transports = this.options.transport || [auth_type_enum_1.AuthTransport.BEARER];
            if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                this.setCookies(res, req, result.accessToken, result.refreshToken);
            }
            if (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                return { message: 'Signup successful', auth: result.auth, tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } };
            }
            return { message: 'Signup successful', auth: result.auth };
        }
        catch (e) {
            throw new common_1.HttpException(e.message || 'Signup error', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async login(dto, res, req) {
        try {
            const userAgent = req.headers['user-agent'];
            const ip = req.ip;
            const result = await this.authService.login(dto, userAgent, ip);
            const transports = this.options.transport || [auth_type_enum_1.AuthTransport.BEARER];
            if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                this.setCookies(res, req, result.accessToken, result.refreshToken);
            }
            if (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                return { message: 'Login successful', auth: result.auth, tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } };
            }
            return { message: 'Login successful', auth: result.auth };
        }
        catch (e) {
            throw new common_1.HttpException(e.message || 'Login error', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async refresh(req, res, dto) {
        try {
            let refreshToken = req.cookies?.['refresh_token'];
            if (!refreshToken && dto.refreshToken) {
                refreshToken = dto.refreshToken;
            }
            if (!refreshToken && req.headers.authorization?.startsWith('Bearer ')) {
                refreshToken = req.headers.authorization.split(' ')[1];
            }
            if (!refreshToken) {
                throw new common_1.UnauthorizedException('No refresh token');
            }
            const userAgent = typeof req.headers['user-agent'] === 'string'
                ? req.headers['user-agent']
                : 'unknown';
            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.ip ||
                'unknown';
            const tokens = await this.authService.refreshTokens(refreshToken, userAgent, ip);
            const transports = this.options.transport || [auth_type_enum_1.AuthTransport.BEARER];
            if (transports.includes(auth_type_enum_1.AuthTransport.COOKIE) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                this.setCookies(res, req, tokens.accessToken, tokens.refreshToken);
            }
            if (transports.includes(auth_type_enum_1.AuthTransport.BEARER) || transports.includes(auth_type_enum_1.AuthTransport.BOTH)) {
                return { message: 'Refreshed successfully', tokens };
            }
            return { message: 'Refreshed successfully' };
        }
        catch (e) {
            console.error('Error refreshing tokens', e);
            res.clearCookie('access_token');
            res.clearCookie('refresh_token', {
                path: this.getDynamicPath(req),
            });
            throw new common_1.HttpException('Invalid refresh session', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async logout(req, res, dto) {
        let refreshToken = req.cookies['refresh_token'];
        if (!refreshToken && dto.refreshToken) {
            refreshToken = dto.refreshToken;
        }
        if (!refreshToken && req.headers.authorization?.startsWith('Bearer ')) {
            refreshToken = req.headers.authorization.split(' ')[1];
        }
        await this.authService.logout(refreshToken ?? '');
        res.clearCookie('access_token');
        res.clearCookie('refresh_token', { path: this.getDynamicPath(req) });
        return { message: 'Logged out successfully' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'User signup' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created' }),
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
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh tokens using cookie' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
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
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __param(1, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [auth_service_1.AuthService, Object])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
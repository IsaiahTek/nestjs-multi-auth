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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
// src/auth/jwt-auth.guard.ts
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const public_decorator_1 = require("../decorator/public.decorator");
const optional_decorator_1 = require("../decorator/optional.decorator");
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const isOptional = this.reflector.getAllAndOverride(optional_decorator_1.IS_OPTIONAL_KEY, [context.getHandler(), context.getClass()]);
        if (isOptional || isPublic) {
            // Try JWT, but don’t throw if missing/invalid
            try {
                return (await super.canActivate(context));
            }
            catch {
                const request = context.switchToHttp().getRequest();
                request.user = null;
                return true;
            }
        }
        // Default = strict JWT required
        return (await super.canActivate(context));
    }
    handleRequest(err, user, info, context) {
        // Check if this is an optional or public route
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const isOptional = this.reflector.getAllAndOverride(optional_decorator_1.IS_OPTIONAL_KEY, [context.getHandler(), context.getClass()]);
        // console.log('Auth user', user);
        // For optional/public routes, allow null user
        if (isOptional || isPublic) {
            return user || null;
        }
        // For protected routes, throw error if no valid user
        if (err || !user) {
            throw err || new common_1.UnauthorizedException('Authentication required');
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map
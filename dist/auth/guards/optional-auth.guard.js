"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OptionalAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionalAuthGuard = void 0;
// src/auth/optional-auth.guard.ts
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let OptionalAuthGuard = OptionalAuthGuard_1 = class OptionalAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(OptionalAuthGuard_1.name);
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        this.logger.debug(`Authorization header: ${authHeader || 'none'}`);
        if (!authHeader) {
            this.logger.debug('No authorization header, skipping JWT check');
            req.user = null; // 👈 set anonymous user
            return true;
        }
        // fallback to normal AuthGuard behavior
        return (await super.canActivate(context));
    }
    handleRequest(err, user, info) {
        if (err) {
            this.logger.warn(`JWT error: ${err.message}`);
        }
        if (info) {
            this.logger.debug(`JWT info: ${JSON.stringify(info)}`);
        }
        return user || null;
    }
};
exports.OptionalAuthGuard = OptionalAuthGuard;
exports.OptionalAuthGuard = OptionalAuthGuard = OptionalAuthGuard_1 = __decorate([
    (0, common_1.Injectable)()
], OptionalAuthGuard);
//# sourceMappingURL=optional-auth.guard.js.map
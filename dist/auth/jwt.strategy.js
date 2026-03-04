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
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
const common_2 = require("@nestjs/common");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(options) {
        const cookieExtractor = (req) => {
            if (!req || !req.cookies) {
                return null;
            }
            const cookies = req.cookies;
            const token = cookies?.access_token ?? null;
            return typeof token === 'string' ? token : null;
        };
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                cookieExtractor,
                passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: options.jwtSecret || process.env.JWT_SECRET || 'changeme',
        });
        this.options = options;
        this.logger = new common_1.Logger(JwtStrategy_1.name);
        this.logger.log(`JWT secret initialized.`);
    }
    validate(payload) {
        this.logger.log(`JWT payload: ${JSON.stringify(payload)}`);
        return {
            sub: payload.sub,
            email: payload.email,
            phone: payload.phone,
            role: payload.role,
            id: payload.sub,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map
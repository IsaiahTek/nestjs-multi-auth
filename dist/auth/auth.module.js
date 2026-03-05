"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuthModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_MODULE_OPTIONS = exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_entity_1 = require("./entities/auth.entity");
const oauth_provider_entity_1 = require("./entities/oauth-provider.entity");
const otp_token_entity_1 = require("./entities/otp-token.entity");
const mfa_method_entity_1 = require("./entities/mfa-method.entity");
const password_strategy_1 = require("./strategies/password.strategy");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_1 = require("@nestjs/jwt");
const google_strategy_1 = require("./strategies/google.strategy");
const otp_strategy_1 = require("./strategies/otp.strategy");
const jwt_strategy_1 = require("./jwt.strategy");
const passport_1 = require("@nestjs/passport");
const auth_identify_entity_1 = require("./entities/auth-identify.entity");
const session_entity_1 = require("./entities/session.entity");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
Object.defineProperty(exports, "AUTH_MODULE_OPTIONS", { enumerable: true, get: function () { return auth_module_options_interface_1.AUTH_MODULE_OPTIONS; } });
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const optional_auth_guard_1 = require("./guards/optional-auth.guard");
let AuthModule = AuthModule_1 = class AuthModule {
    static register(options) {
        const optionsProvider = {
            provide: auth_module_options_interface_1.AUTH_MODULE_OPTIONS,
            useValue: options,
        };
        const providers = [
            optionsProvider,
            jwt_strategy_1.JwtStrategy,
            auth_service_1.AuthService,
            password_strategy_1.PasswordAuthStrategy,
            google_strategy_1.GoogleAuthStrategy,
            otp_strategy_1.OtpAuthStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            optional_auth_guard_1.OptionalAuthGuard,
        ];
        if (options.notificationProvider) {
            providers.push({
                provide: auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER,
                useClass: options.notificationProvider,
            });
        }
        if (!options.disableGlobalGuard) {
            providers.push({
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            });
        }
        return {
            module: AuthModule_1,
            imports: [
                typeorm_1.TypeOrmModule.forFeature([
                    auth_entity_1.Auth,
                    oauth_provider_entity_1.OAuthProvider,
                    auth_identify_entity_1.AuthIdentifier,
                    otp_token_entity_1.OtpToken,
                    mfa_method_entity_1.MfaMethod,
                    session_entity_1.Session,
                ]),
                passport_1.PassportModule,
                jwt_1.JwtModule.register({ secret: options.jwtSecret || process.env.JWT_SECRET || 'changeme' }),
                ...(options.imports || []),
            ],
            providers,
            controllers: options.disableController ? [] : [auth_controller_1.AuthController],
            exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard],
        };
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = AuthModule_1 = __decorate([
    (0, common_1.Module)({})
], AuthModule);
//# sourceMappingURL=auth.module.js.map
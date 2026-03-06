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
const local_auth_strategy_1 = require("./strategies/local-auth.strategy");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_1 = require("@nestjs/jwt");
const oauth_strategy_1 = require("./strategies/oauth/oauth.strategy");
const google_strategy_1 = require("./strategies/oauth/google.strategy");
const apple_strategy_1 = require("./strategies/oauth/apple.strategy");
const facebook_strategy_1 = require("./strategies/oauth/facebook.strategy");
const otp_strategy_1 = require("./strategies/otp.strategy");
const jwt_strategy_1 = require("./jwt.strategy");
const auth_type_enum_1 = require("./auth-type.enum");
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
            jwt_auth_guard_1.JwtAuthGuard,
            optional_auth_guard_1.OptionalAuthGuard,
        ];
        const enabledStrategies = options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        const isLocalEnabled = enabledStrategies.some(s => [auth_type_enum_1.AuthStrategy.EMAIL, auth_type_enum_1.AuthStrategy.PHONE, auth_type_enum_1.AuthStrategy.USERNAME, auth_type_enum_1.AuthStrategy.LOCAL].includes(s));
        const isOAuthEnabled = enabledStrategies.some(s => [auth_type_enum_1.AuthStrategy.GOOGLE, auth_type_enum_1.AuthStrategy.FACEBOOK, auth_type_enum_1.AuthStrategy.APPLE, auth_type_enum_1.AuthStrategy.OAUTH].includes(s));
        const isOtpEnabled = enabledStrategies.includes(auth_type_enum_1.AuthStrategy.OTP);
        if (isLocalEnabled) {
            providers.push(local_auth_strategy_1.LocalAuthStrategy);
        }
        if (isOtpEnabled) {
            providers.push(otp_strategy_1.OtpAuthStrategy);
        }
        if (isOAuthEnabled) {
            providers.push(oauth_strategy_1.OAuthAuthStrategy, google_strategy_1.GoogleAuthStrategy, apple_strategy_1.AppleAuthStrategy, facebook_strategy_1.FacebookAuthStrategy);
        }
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
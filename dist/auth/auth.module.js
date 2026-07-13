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
// src/auth/auth.module.ts
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_1 = require("@nestjs/jwt");
const jwt_strategy_1 = require("./core/jwt.strategy");
const passport_1 = require("@nestjs/passport");
const auth_module_options_interface_1 = require("./interfaces/auth-module-options.interface");
Object.defineProperty(exports, "AUTH_MODULE_OPTIONS", { enumerable: true, get: function () { return auth_module_options_interface_1.AUTH_MODULE_OPTIONS; } });
const auth_notification_provider_interface_1 = require("./interfaces/auth-notification-provider.interface");
const auth_otp_provider_interface_1 = require("./interfaces/auth-otp-provider.interface");
const core_2 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const optional_auth_guard_1 = require("./guards/optional-auth.guard");
const throttler_1 = require("@nestjs/throttler");
const registration_1 = require("./core/registration");
const auth_schema_initializer_1 = require("../database/typeorm/migrations/auth-schema.initializer");
const migration_service_1 = require("../database/typeorm/migrations/migration.service");
const local_auth_strategy_1 = require("./strategies/local-auth.strategy");
const google_strategy_1 = require("./strategies/oauth/google.strategy");
const facebook_strategy_1 = require("./strategies/oauth/facebook.strategy");
const apple_strategy_1 = require("./strategies/oauth/apple.strategy");
const oauth_strategy_1 = require("./strategies/oauth/oauth.strategy");
const auth_context_resolver_1 = require("./core/auth-context.resolver");
const typeorm_auth_adapter_1 = require("../database/typeorm/typeorm-auth.adapter");
const database_otp_provider_1 = require("./core/database-otp.provider");
let AuthModule = AuthModule_1 = class AuthModule {
    static register(options) {
        const optionsProvider = {
            provide: auth_module_options_interface_1.AUTH_MODULE_OPTIONS,
            useValue: options,
        };
        const strategyProviders = (0, registration_1.createStrategyProviders)(options);
        const providers = [
            optionsProvider,
            ...this.createProviders(),
            ...strategyProviders,
        ];
        if (options.notificationProvider) {
            providers.push({
                provide: auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER,
                useClass: options.notificationProvider,
            });
        }
        if (!options.disableGlobalGuard) {
            providers.push({
                provide: core_2.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            });
        }
        const imports = [
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: options.jwtSecret || process.env.JWT_SECRET || 'changeme',
                signOptions: { expiresIn: (options.accessTokenExpiresIn || '15m') },
            }),
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [
                    {
                        ttl: (options.throttlerTtl || 60) * 1000,
                        limit: options.throttlerLimit || 10,
                    },
                ],
            }),
            ...(options.imports || []),
        ];
        if (!options.adapter) {
            imports.push(typeorm_auth_adapter_1.TypeOrmAuthAdapter);
        }
        else {
            imports.push(options.adapter);
        }
        const defaultOtpClass = options.otpProvider || database_otp_provider_1.DatabaseOtpProvider;
        providers.push({ provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER, useClass: defaultOtpClass }, { provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_EMAIL, useClass: options.otpProviders?.email || defaultOtpClass }, { provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_PHONE, useClass: options.otpProviders?.phone || defaultOtpClass });
        return {
            module: AuthModule_1,
            imports,
            providers,
            controllers: options.disableController ? [] : [auth_controller_1.AuthController],
            exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, optional_auth_guard_1.OptionalAuthGuard, throttler_1.ThrottlerModule, jwt_1.JwtModule, passport_1.PassportModule, auth_module_options_interface_1.AUTH_MODULE_OPTIONS],
        };
    }
    static createProviders() {
        return [
            jwt_strategy_1.JwtStrategy,
            auth_service_1.AuthService,
            jwt_auth_guard_1.JwtAuthGuard,
            optional_auth_guard_1.OptionalAuthGuard,
            throttler_1.ThrottlerGuard,
            migration_service_1.AuthMigrationService,
            auth_schema_initializer_1.AuthSchemaInitializer,
            auth_context_resolver_1.AuthContextService,
            database_otp_provider_1.DatabaseOtpProvider,
        ];
    }
    static forRootAsync(options) {
        const asyncOptionsProvider = {
            provide: auth_module_options_interface_1.AUTH_MODULE_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject || [],
        };
        const imports = [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS],
                useFactory: async (opts) => ({
                    secret: opts.jwtSecret || process.env.JWT_SECRET || 'changeme',
                    signOptions: {
                        expiresIn: (opts.accessTokenExpiresIn || '15m'),
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS],
                useFactory: async (opts) => ({
                    throttlers: [
                        {
                            ttl: (opts.throttlerTtl || 60) * 1000,
                            limit: opts.throttlerLimit || 10,
                        },
                    ],
                }),
            }),
            ...(options.imports || []),
        ];
        if (options.adapter !== null) {
            if (!options.adapter) {
                imports.push(typeorm_auth_adapter_1.TypeOrmAuthAdapter);
            }
            else {
                imports.push(options.adapter);
            }
        }
        return {
            module: AuthModule_1,
            global: true,
            imports,
            providers: [
                asyncOptionsProvider,
                ...this.createProviders(),
                local_auth_strategy_1.LocalAuthStrategy,
                google_strategy_1.GoogleAuthStrategy,
                facebook_strategy_1.FacebookAuthStrategy,
                apple_strategy_1.AppleAuthStrategy,
                oauth_strategy_1.OAuthAuthStrategy,
                {
                    provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER,
                    useFactory: async (opts, defaultOtp, moduleRef) => {
                        const provider = opts.otpProvider;
                        if (!provider)
                            return defaultOtp;
                        if (typeof provider === 'function' && provider.prototype) {
                            try {
                                return moduleRef.get(provider, { strict: false });
                            }
                            catch (e) {
                                return await moduleRef.create(provider);
                            }
                        }
                        return provider;
                    },
                    inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS, database_otp_provider_1.DatabaseOtpProvider, core_1.ModuleRef],
                },
                {
                    provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_EMAIL,
                    useFactory: async (opts, defaultOtp, moduleRef) => {
                        const provider = opts.otpProviders?.email || opts.otpProvider;
                        if (!provider)
                            return defaultOtp;
                        if (typeof provider === 'function' && provider.prototype) {
                            try {
                                return moduleRef.get(provider, { strict: false });
                            }
                            catch (e) {
                                return await moduleRef.create(provider);
                            }
                        }
                        return provider;
                    },
                    inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS, database_otp_provider_1.DatabaseOtpProvider, core_1.ModuleRef],
                },
                {
                    provide: auth_otp_provider_interface_1.AUTH_OTP_PROVIDER_PHONE,
                    useFactory: async (opts, defaultOtp, moduleRef) => {
                        const provider = opts.otpProviders?.phone || opts.otpProvider;
                        if (!provider)
                            return defaultOtp;
                        if (typeof provider === 'function' && provider.prototype) {
                            try {
                                return moduleRef.get(provider, { strict: false });
                            }
                            catch (e) {
                                return await moduleRef.create(provider);
                            }
                        }
                        return provider;
                    },
                    inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS, database_otp_provider_1.DatabaseOtpProvider, core_1.ModuleRef],
                },
                {
                    provide: auth_notification_provider_interface_1.AUTH_NOTIFICATION_PROVIDER,
                    useFactory: async (opts, moduleRef) => {
                        const provider = opts.notificationProvider;
                        if (!provider)
                            return null;
                        if (typeof provider === 'function' && provider.prototype) {
                            try {
                                return moduleRef.get(provider, { strict: false });
                            }
                            catch (e) {
                                return await moduleRef.create(provider);
                            }
                        }
                        return provider;
                    },
                    inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS, core_1.ModuleRef],
                },
                {
                    provide: core_2.APP_GUARD,
                    useFactory: (opts, guard) => {
                        return opts.disableGlobalGuard ? { canActivate: () => true } : guard;
                    },
                    inject: [auth_module_options_interface_1.AUTH_MODULE_OPTIONS, jwt_auth_guard_1.JwtAuthGuard],
                },
            ],
            controllers: options.disableController ? [] : [auth_controller_1.AuthController],
            exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, optional_auth_guard_1.OptionalAuthGuard, throttler_1.ThrottlerModule, jwt_1.JwtModule, passport_1.PassportModule, auth_module_options_interface_1.AUTH_MODULE_OPTIONS],
        };
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = AuthModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], AuthModule);
//# sourceMappingURL=auth.module.js.map
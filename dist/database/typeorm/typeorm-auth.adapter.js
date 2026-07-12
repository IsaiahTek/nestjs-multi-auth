"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeOrmAuthAdapter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_entity_1 = require("./entities/auth.entity");
const auth_identify_entity_1 = require("./entities/auth-identify.entity");
const oauth_provider_entity_1 = require("./entities/oauth-provider.entity");
const otp_token_entity_1 = require("./entities/otp-token.entity");
const mfa_method_entity_1 = require("./entities/mfa-method.entity");
const session_entity_1 = require("./entities/session.entity");
const session_log_entity_1 = require("./entities/session_log.entity");
const repositories_1 = require("./repositories");
const repository_tokens_1 = require("../../auth/interfaces/repository-tokens");
const entities = [
    auth_entity_1.Auth,
    auth_identify_entity_1.AuthIdentifier,
    oauth_provider_entity_1.OAuthProvider,
    otp_token_entity_1.OtpToken,
    mfa_method_entity_1.MfaMethod,
    session_entity_1.Session,
    session_log_entity_1.SessionLog,
];
const providers = [
    { provide: repository_tokens_1.AUTH_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmAuthRepository },
    { provide: repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmAuthIdentifierRepository },
    { provide: repository_tokens_1.OAUTH_PROVIDER_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmOAuthProviderRepository },
    { provide: repository_tokens_1.OTP_TOKEN_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmOtpTokenRepository },
    { provide: repository_tokens_1.MFA_METHOD_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmMfaMethodRepository },
    { provide: repository_tokens_1.SESSION_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmSessionRepository },
    { provide: repository_tokens_1.SESSION_LOG_REPOSITORY_TOKEN, useClass: repositories_1.TypeOrmSessionLogRepository },
];
let TypeOrmAuthAdapter = class TypeOrmAuthAdapter {
};
exports.TypeOrmAuthAdapter = TypeOrmAuthAdapter;
exports.TypeOrmAuthAdapter = TypeOrmAuthAdapter = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature(entities)],
        providers: providers,
        exports: providers,
    })
], TypeOrmAuthAdapter);
//# sourceMappingURL=typeorm-auth.adapter.js.map
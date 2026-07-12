"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaAuthAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAuthAdapter = void 0;
const common_1 = require("@nestjs/common");
const repository_tokens_1 = require("../../auth/interfaces/repository-tokens");
const repositories_1 = require("./repositories");
let PrismaAuthAdapter = PrismaAuthAdapter_1 = class PrismaAuthAdapter {
    static register(options = {}) {
        const prismaServiceToken = options.prismaServiceToken || 'PRISMA_SERVICE';
        const aliasProvider = {
            provide: 'PRISMA_SERVICE_TOKEN',
            useExisting: prismaServiceToken,
        };
        const providers = [
            aliasProvider,
            {
                provide: repository_tokens_1.AUTH_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaAuthRepository,
            },
            {
                provide: repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaAuthIdentifierRepository,
            },
            {
                provide: repository_tokens_1.SESSION_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaSessionRepository,
            },
            {
                provide: repository_tokens_1.MFA_METHOD_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaMfaMethodRepository,
            },
            {
                provide: repository_tokens_1.OAUTH_PROVIDER_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaOAuthProviderRepository,
            },
            {
                provide: repository_tokens_1.SESSION_LOG_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaSessionLogRepository,
            },
            {
                provide: repository_tokens_1.OTP_TOKEN_REPOSITORY_TOKEN,
                useClass: repositories_1.PrismaOtpTokenRepository,
            },
        ];
        return {
            module: PrismaAuthAdapter_1,
            providers,
            exports: providers.map(p => p.provide),
        };
    }
};
exports.PrismaAuthAdapter = PrismaAuthAdapter;
exports.PrismaAuthAdapter = PrismaAuthAdapter = PrismaAuthAdapter_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], PrismaAuthAdapter);
//# sourceMappingURL=prisma-auth.adapter.js.map
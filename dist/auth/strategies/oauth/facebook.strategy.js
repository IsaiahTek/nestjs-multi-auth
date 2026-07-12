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
exports.FacebookAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const identifier_type_enum_1 = require("../../enums/identifier-type.enum");
const auth_type_enum_1 = require("../../enums/auth-type.enum");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
const repository_tokens_1 = require("../../interfaces/repository-tokens");
let FacebookAuthStrategy = class FacebookAuthStrategy {
    constructor(authRepo, identifierRepo, oauthProviderRepo, options) {
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.oauthProviderRepo = oauthProviderRepo;
        this.options = options;
    }
    async verifyToken(token) {
        try {
            // Create App Secret Proof for security if secret is provided
            let appSecretProof = '';
            if (this.options.facebookAppSecret) {
                appSecretProof = (0, crypto_1.createHmac)('sha256', this.options.facebookAppSecret)
                    .update(token)
                    .digest('hex');
            }
            const url = `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) {
                throw new common_1.BadRequestException(`Facebook error: ${data.error.message}`);
            }
            if (!data.id) {
                throw new common_1.BadRequestException('Invalid Facebook token payload');
            }
            return data;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to verify Facebook token');
        }
    }
    async registerCredentials(dto, uid) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Facebook access token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;
        const email = payload.email?.toLowerCase();
        const existingProvider = await this.oauthProviderRepo.findByProviderUserId(auth_type_enum_1.OAuthProviderType.FACEBOOK, facebookId);
        if (existingProvider) {
            throw new common_1.BadRequestException('This Facebook account is already linked to a user');
        }
        if (email) {
            const existingIdentifier = await this.identifierRepo.findByValue(email);
            if (existingIdentifier) {
                throw new common_1.BadRequestException('A user with this email already exists');
            }
        }
        const identityUid = uid || (0, crypto_1.randomUUID)();
        const newAuth = await this.authRepo.create({
            uid: identityUid,
            strategy: auth_type_enum_1.AuthStrategy.OAUTH,
            isActive: true,
            isVerified: true, // Facebook verifies emails
            isPrimary: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const identifiers = [];
        if (email) {
            identifiers.push(await this.identifierRepo.create({
                auth: newAuth,
                type: identifier_type_enum_1.IdentifierType.EMAIL,
                value: email,
                isVerified: true,
                source: identifier_type_enum_1.IdentifierSource.FACEBOOK,
                verifiedBy: 'PROVIDER',
            }));
        }
        newAuth.identifiers = identifiers;
        const oauthProvider = await this.oauthProviderRepo.create({
            auth: newAuth,
            provider: auth_type_enum_1.OAuthProviderType.FACEBOOK,
            providerUserId: facebookId,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
            rawProfile: payload,
            emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
            displayName: payload.name,
            avatarUrl: payload.picture,
        });
        newAuth.oauthProviders = [oauthProvider];
        const savedAuth = await this.authRepo.save(newAuth);
        return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
    }
    async login(dto) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Facebook access token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;
        const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(auth_type_enum_1.OAuthProviderType.FACEBOOK, facebookId);
        if (!result || !result.auth) {
            throw new common_1.BadRequestException('No account found linked to this Facebook account');
        }
        const oauthProvider = result.provider;
        const auth = result.auth;
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        const email = payload.email?.toLowerCase();
        const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);
        const identifier = updatedAuth?.identifiers?.find(id => id.value === email);
        return { auth: updatedAuth || auth, identifier: identifier || undefined };
    }
};
exports.FacebookAuthStrategy = FacebookAuthStrategy;
exports.FacebookAuthStrategy = FacebookAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.AUTH_REPOSITORY_TOKEN)),
    __param(1, (0, common_1.Inject)(repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN)),
    __param(2, (0, common_1.Inject)(repository_tokens_1.OAUTH_PROVIDER_REPOSITORY_TOKEN)),
    __param(3, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], FacebookAuthStrategy);
//# sourceMappingURL=facebook.strategy.js.map
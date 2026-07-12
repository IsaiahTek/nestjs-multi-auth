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
exports.AppleAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const identifier_type_enum_1 = require("../../enums/identifier-type.enum");
const auth_type_enum_1 = require("../../enums/auth-type.enum");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
const jwt = require("jsonwebtoken");
const repository_tokens_1 = require("../../interfaces/repository-tokens");
let AppleAuthStrategy = class AppleAuthStrategy {
    constructor(authRepo, identifierRepo, oauthProviderRepo, options) {
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.oauthProviderRepo = oauthProviderRepo;
        this.options = options;
        this.applePublicKeys = [];
        this.lastKeysFetch = 0;
    }
    async getApplePublicKeys() {
        // Cache keys for 24 hours
        const now = Date.now();
        if (this.applePublicKeys.length > 0 && now - this.lastKeysFetch < 24 * 60 * 60 * 1000) {
            return this.applePublicKeys;
        }
        try {
            const response = await fetch('https://appleid.apple.com/auth/keys');
            const data = await response.json();
            this.applePublicKeys = data.keys;
            this.lastKeysFetch = now;
            return this.applePublicKeys;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch Apple public keys');
        }
    }
    async verifyToken(token) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header || !decoded.header.kid) {
                throw new common_1.BadRequestException('Invalid Apple token header');
            }
            const keys = await this.getApplePublicKeys();
            const jwk = keys.find(k => k.kid === decoded.header.kid);
            if (!jwk) {
                throw new common_1.BadRequestException('Apple public key not found');
            }
            // Using Node.js native crypto to convert JWK to PublicKey object
            const publicKey = (0, crypto_1.createPublicKey)({
                key: jwk,
                format: 'jwk',
            });
            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
                audience: this.options.appleClientId,
                issuer: 'https://appleid.apple.com',
            });
            if (!payload || !payload.sub) {
                throw new common_1.BadRequestException('Invalid Apple token payload');
            }
            return payload;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException(`Apple token verification failed: ${error.message}`);
        }
    }
    async registerCredentials(dto, uid) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Apple ID token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;
        const email = payload.email?.toLowerCase();
        const existingProvider = await this.oauthProviderRepo.findByProviderUserId(auth_type_enum_1.OAuthProviderType.APPLE, appleId);
        if (existingProvider) {
            throw new common_1.BadRequestException('This Apple account is already linked to a user');
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
            isVerified: payload.email_verified === 'true' || payload.email_verified === true,
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
                isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                source: identifier_type_enum_1.IdentifierSource.APPLE,
                verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
            }));
        }
        newAuth.identifiers = identifiers;
        const oauthProvider = await this.oauthProviderRepo.create({
            auth: newAuth,
            provider: auth_type_enum_1.OAuthProviderType.APPLE,
            providerUserId: appleId,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
            rawProfile: payload,
            emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
            displayName: payload.name?.displayName,
            avatarUrl: payload.picture,
        });
        newAuth.oauthProviders = [oauthProvider];
        const savedAuth = await this.authRepo.save(newAuth);
        return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
    }
    async login(dto) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Apple ID token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;
        const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(auth_type_enum_1.OAuthProviderType.APPLE, appleId);
        if (!result || !result.auth) {
            throw new common_1.BadRequestException('No account found linked to this Apple account');
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
exports.AppleAuthStrategy = AppleAuthStrategy;
exports.AppleAuthStrategy = AppleAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.AUTH_REPOSITORY_TOKEN)),
    __param(1, (0, common_1.Inject)(repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN)),
    __param(2, (0, common_1.Inject)(repository_tokens_1.OAUTH_PROVIDER_REPOSITORY_TOKEN)),
    __param(3, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], AppleAuthStrategy);
//# sourceMappingURL=apple.strategy.js.map
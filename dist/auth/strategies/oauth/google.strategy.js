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
exports.GoogleAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const google_auth_library_1 = require("google-auth-library");
const identifier_type_enum_1 = require("../../enums/identifier-type.enum");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
const auth_type_enum_1 = require("../../enums/auth-type.enum");
const repository_tokens_1 = require("../../interfaces/repository-tokens");
let GoogleAuthStrategy = class GoogleAuthStrategy {
    constructor(authRepo, identifierRepo, oauthProviderRepo, options) {
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.oauthProviderRepo = oauthProviderRepo;
        this.options = options;
        this.client = new google_auth_library_1.OAuth2Client(this.options.googleClientId);
    }
    async verifyToken(token) {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                audience: this.options.googleClientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new common_1.BadRequestException('Invalid Google token payload');
            }
            return payload;
        }
        catch (error) {
            throw new common_1.BadRequestException('Invalid Google token');
        }
    }
    async registerCredentials(dto, uid) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Google ID token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const googleId = payload.sub;
        const email = payload.email?.toLowerCase();
        const existingProvider = await this.oauthProviderRepo.findByProviderUserId(auth_type_enum_1.OAuthProviderType.GOOGLE, googleId);
        if (existingProvider) {
            throw new common_1.BadRequestException('This Google account is already linked to a user');
        }
        if (email) {
            const existingIdentifier = await this.identifierRepo.findByValue(email);
            if (existingIdentifier) {
                throw new common_1.BadRequestException('A user with this email already exists. Please login instead.');
            }
        }
        const identityUid = uid || (0, crypto_1.randomUUID)();
        const newAuth = await this.authRepo.create({
            uid: identityUid,
            strategy: auth_type_enum_1.AuthStrategy.OAUTH,
            isActive: true,
            isVerified: this.options.forceVerificationOnGoogleSignup ? false : (payload.email_verified || false),
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
                isVerified: this.options.forceVerificationOnGoogleSignup ? false : (payload.email_verified || false),
                source: identifier_type_enum_1.IdentifierSource.GOOGLE,
                verifiedBy: payload.email_verified ? 'PROVIDER' : undefined,
            }));
        }
        newAuth.identifiers = identifiers;
        const oauthProvider = await this.oauthProviderRepo.create({
            auth: newAuth,
            provider: auth_type_enum_1.OAuthProviderType.GOOGLE,
            providerUserId: googleId,
            rawProfile: payload,
            displayName: payload.name,
            avatarUrl: payload.picture,
            emailVerified: payload.email_verified,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        });
        newAuth.oauthProviders = [oauthProvider];
        return { auth: await this.authRepo.save(newAuth), identifier: newAuth.identifiers?.[0] };
    }
    async login(dto) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Google ID token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const googleId = payload.sub;
        const email = payload.email?.toLowerCase();
        const result = await this.oauthProviderRepo.findWithAuthByProviderUserId(auth_type_enum_1.OAuthProviderType.GOOGLE, googleId);
        if (!result || !result.auth) {
            throw new common_1.BadRequestException('No account found linked to this Google account. Please sign up.');
        }
        const oauthProvider = result.provider;
        const auth = result.auth;
        oauthProvider.rawProfile = payload;
        oauthProvider.displayName = payload.name ?? null;
        oauthProvider.avatarUrl = payload.picture ?? null;
        oauthProvider.emailVerified = payload.email_verified ?? false;
        auth.lastUsedAt = new Date();
        let identifier = null;
        if (email) {
            const idResult = await this.identifierRepo.findWithAuthByValue(email);
            // If the email exists but belongs to a different user, we skip updating it
            // to avoid a unique constraint violation.
            if (idResult && idResult.auth?.id !== auth.id) {
                identifier = null;
            }
            else {
                identifier = idResult?.identifier || null;
                if (!identifier) {
                    identifier = await this.identifierRepo.create({
                        auth,
                        type: identifier_type_enum_1.IdentifierType.EMAIL,
                        value: email,
                        isVerified: false,
                    });
                }
                identifier.value = email;
                if (!this.options.forceVerificationOnGoogleLogin) {
                    identifier.isVerified = payload.email_verified ?? false;
                }
                identifier.verifiedBy = payload.email_verified ? 'PROVIDER' : identifier.verifiedBy;
                identifier.source = identifier_type_enum_1.IdentifierSource.GOOGLE;
                await this.identifierRepo.save(identifier);
            }
        }
        await this.oauthProviderRepo.save(oauthProvider);
        await this.authRepo.save(auth);
        const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);
        const updatedIdentifier = updatedAuth?.identifiers?.find((i) => i.type === identifier_type_enum_1.IdentifierType.EMAIL && i.value === email) || identifier;
        return {
            auth: updatedAuth || auth,
            identifier: updatedIdentifier || undefined,
        };
    }
};
exports.GoogleAuthStrategy = GoogleAuthStrategy;
exports.GoogleAuthStrategy = GoogleAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.AUTH_REPOSITORY_TOKEN)),
    __param(1, (0, common_1.Inject)(repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN)),
    __param(2, (0, common_1.Inject)(repository_tokens_1.OAUTH_PROVIDER_REPOSITORY_TOKEN)),
    __param(3, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], GoogleAuthStrategy);
//# sourceMappingURL=google.strategy.js.map
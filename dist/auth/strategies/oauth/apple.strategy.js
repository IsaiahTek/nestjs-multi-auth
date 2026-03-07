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
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const auth_entity_1 = require("../../entities/auth.entity");
const oauth_provider_entity_1 = require("../../entities/oauth-provider.entity");
const auth_identify_entity_1 = require("../../entities/auth-identify.entity");
const auth_type_enum_1 = require("../../auth-type.enum");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
const jwt = require("jsonwebtoken");
let AppleAuthStrategy = class AppleAuthStrategy {
    constructor(dataSource, authRepo, oauthProviderRepo, options) {
        this.dataSource = dataSource;
        this.authRepo = authRepo;
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
        return this.dataSource.transaction(async (manager) => {
            const authRepo = manager.getRepository(auth_entity_1.Auth);
            const oauthProviderRepo = manager.getRepository(oauth_provider_entity_1.OAuthProvider);
            const identifierRepo = manager.getRepository(auth_identify_entity_1.AuthIdentifier);
            // Check if this Apple account is already linked
            const existingProvider = await oauthProviderRepo.findOne({
                where: { provider: auth_type_enum_1.OAuthProviderType.APPLE, providerUserId: appleId },
                relations: ['auth'],
            });
            if (existingProvider) {
                throw new common_1.BadRequestException('This Apple account is already linked to a user');
            }
            // Check if email identifier is already taken
            if (email) {
                const existingIdentifier = await identifierRepo.findOne({
                    where: { value: email, type: auth_identify_entity_1.IdentifierType.EMAIL },
                });
                if (existingIdentifier) {
                    throw new common_1.BadRequestException('A user with this email already exists');
                }
            }
            const identityUid = uid || (0, crypto_1.randomUUID)();
            const newAuth = authRepo.create({
                uid: identityUid,
                strategy: auth_type_enum_1.AuthStrategy.OAUTH,
                isActive: true,
                isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                isPrimary: true,
            });
            const identifiers = [];
            if (email) {
                identifiers.push(identifierRepo.create({
                    type: auth_identify_entity_1.IdentifierType.EMAIL,
                    value: email,
                    isVerified: payload.email_verified === 'true' || payload.email_verified === true,
                }));
            }
            newAuth.identifiers = identifiers;
            const oauthProvider = oauthProviderRepo.create({
                provider: auth_type_enum_1.OAuthProviderType.APPLE,
                providerUserId: appleId,
            });
            newAuth.oauthProvider = oauthProvider;
            const savedAuth = await authRepo.save(newAuth);
            return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
        });
    }
    async login(dto) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Apple ID token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const appleId = payload.sub;
        const oauthProvider = await this.oauthProviderRepo.findOne({
            where: { provider: auth_type_enum_1.OAuthProviderType.APPLE, providerUserId: appleId },
            relations: ['auth', 'auth.identifiers'],
        });
        if (!oauthProvider || !oauthProvider.auth) {
            throw new common_1.BadRequestException('No account found linked to this Apple account');
        }
        const auth = oauthProvider.auth;
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        const email = payload.email?.toLowerCase();
        const identifier = auth.identifiers?.find(id => id.value === email);
        return { auth, identifier };
    }
};
exports.AppleAuthStrategy = AppleAuthStrategy;
exports.AppleAuthStrategy = AppleAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(auth_entity_1.Auth)),
    __param(2, (0, typeorm_2.InjectRepository)(oauth_provider_entity_1.OAuthProvider)),
    __param(3, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository,
        typeorm_1.Repository, Object])
], AppleAuthStrategy);
//# sourceMappingURL=apple.strategy.js.map
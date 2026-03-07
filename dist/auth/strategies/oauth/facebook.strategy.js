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
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const auth_entity_1 = require("../../entities/auth.entity");
const oauth_provider_entity_1 = require("../../entities/oauth-provider.entity");
const auth_identify_entity_1 = require("../../entities/auth-identify.entity");
const auth_type_enum_1 = require("../../auth-type.enum");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const crypto_1 = require("crypto");
let FacebookAuthStrategy = class FacebookAuthStrategy {
    constructor(dataSource, authRepo, oauthProviderRepo, options) {
        this.dataSource = dataSource;
        this.authRepo = authRepo;
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
        return this.dataSource.transaction(async (manager) => {
            const authRepo = manager.getRepository(auth_entity_1.Auth);
            const oauthProviderRepo = manager.getRepository(oauth_provider_entity_1.OAuthProvider);
            const identifierRepo = manager.getRepository(auth_identify_entity_1.AuthIdentifier);
            // Check if this Facebook account is already linked
            const existingProvider = await oauthProviderRepo.findOne({
                where: { provider: auth_type_enum_1.OAuthProviderType.FACEBOOK, providerUserId: facebookId },
                relations: ['auth'],
            });
            if (existingProvider) {
                throw new common_1.BadRequestException('This Facebook account is already linked to a user');
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
                isVerified: true, // Facebook verifies emails
                isPrimary: true,
            });
            const identifiers = [];
            if (email) {
                identifiers.push(identifierRepo.create({
                    type: auth_identify_entity_1.IdentifierType.EMAIL,
                    value: email,
                    isVerified: true,
                }));
            }
            newAuth.identifiers = identifiers;
            const oauthProvider = oauthProviderRepo.create({
                provider: auth_type_enum_1.OAuthProviderType.FACEBOOK,
                providerUserId: facebookId,
            });
            newAuth.oauthProvider = oauthProvider;
            const savedAuth = await authRepo.save(newAuth);
            return { auth: savedAuth, identifier: savedAuth.identifiers?.[0] };
        });
    }
    async login(dto) {
        if (!dto.token) {
            throw new common_1.BadRequestException('Facebook access token is required');
        }
        const payload = await this.verifyToken(dto.token);
        const facebookId = payload.id;
        const oauthProvider = await this.oauthProviderRepo.findOne({
            where: { provider: auth_type_enum_1.OAuthProviderType.FACEBOOK, providerUserId: facebookId },
            relations: ['auth', 'auth.identifiers'],
        });
        if (!oauthProvider || !oauthProvider.auth) {
            throw new common_1.BadRequestException('No account found linked to this Facebook account');
        }
        const auth = oauthProvider.auth;
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        const email = payload.email?.toLowerCase();
        const identifier = auth.identifiers?.find(id => id.value === email);
        return { auth, identifier };
    }
};
exports.FacebookAuthStrategy = FacebookAuthStrategy;
exports.FacebookAuthStrategy = FacebookAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(auth_entity_1.Auth)),
    __param(2, (0, typeorm_2.InjectRepository)(oauth_provider_entity_1.OAuthProvider)),
    __param(3, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository,
        typeorm_1.Repository, Object])
], FacebookAuthStrategy);
//# sourceMappingURL=facebook.strategy.js.map
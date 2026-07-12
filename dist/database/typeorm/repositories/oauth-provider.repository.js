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
exports.TypeOrmOAuthProviderRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const oauth_provider_entity_1 = require("../entities/oauth-provider.entity");
let TypeOrmOAuthProviderRepository = class TypeOrmOAuthProviderRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.create(data);
    }
    async findByProviderUserId(provider, providerUserId) {
        return this.repo.findOne({ where: { provider, providerUserId } });
    }
    async findWithAuthByProviderUserId(provider, providerUserId) {
        const result = await this.repo.findOne({
            where: { provider: provider, providerUserId },
            relations: ['auth', 'auth.identifiers'],
        });
        if (!result || !result.auth)
            return null;
        return { provider: result, auth: result.auth };
    }
    async save(provider) {
        return this.repo.save(provider);
    }
    async update(id, data) {
        await this.repo.update(id, data);
    }
};
exports.TypeOrmOAuthProviderRepository = TypeOrmOAuthProviderRepository;
exports.TypeOrmOAuthProviderRepository = TypeOrmOAuthProviderRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(oauth_provider_entity_1.OAuthProvider)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmOAuthProviderRepository);
//# sourceMappingURL=oauth-provider.repository.js.map
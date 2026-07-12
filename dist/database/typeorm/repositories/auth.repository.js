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
exports.TypeOrmAuthRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_entity_1 = require("../entities/auth.entity");
let TypeOrmAuthRepository = class TypeOrmAuthRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const entity = this.repo.create(data);
        return entity;
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findByUid(uid) {
        return this.repo.findOne({ where: { uid } });
    }
    async findByUidAndStrategy(uid, strategy) {
        return this.repo.findOne({ where: { uid, strategy } });
    }
    async findByUidAndStrategies(uid, strategies) {
        return this.repo.findOne({ where: { uid, strategy: (0, typeorm_2.In)(strategies) } });
    }
    async findAllByUid(uid) {
        return this.repo.find({ where: { uid }, relations: ['identifiers', 'oauthProviders'] });
    }
    async findAll() {
        return this.repo.find({ relations: ['identifiers', 'oauthProviders'] });
    }
    async save(auth) {
        return this.repo.save(auth);
    }
    async update(id, data) {
        await this.repo.update(id, data);
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async deleteByUid(uid) {
        await this.repo.delete({ uid });
    }
    async findWithIdentifiers(id) {
        return this.repo.findOne({
            where: { id },
            relations: ['identifiers'],
        });
    }
};
exports.TypeOrmAuthRepository = TypeOrmAuthRepository;
exports.TypeOrmAuthRepository = TypeOrmAuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auth_entity_1.Auth)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmAuthRepository);
//# sourceMappingURL=auth.repository.js.map
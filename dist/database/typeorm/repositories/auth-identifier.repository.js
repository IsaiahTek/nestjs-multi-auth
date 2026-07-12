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
exports.TypeOrmAuthIdentifierRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_identify_entity_1 = require("../entities/auth-identify.entity");
let TypeOrmAuthIdentifierRepository = class TypeOrmAuthIdentifierRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.create(data);
    }
    async findByValue(value) {
        return this.repo.findOne({ where: { value } });
    }
    async findByAuthId(authId) {
        return this.repo.find({ where: { auth: { id: authId } } });
    }
    async findByUidAndTypes(uid, types) {
        const res = await this.repo.query(`SELECT ai.* FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE a.uid = $1 AND ai.type = ANY($2::auth_identifier_type_enum[])
       ORDER BY ai."isVerified" DESC, ai."createdAt" ASC LIMIT 1`, [uid, types]);
        return res[0] || null;
    }
    async findWithAuthByValue(value) {
        const res = await this.repo.query(`SELECT ai.*, a.uid, a.id as "authId" FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE ai.value = $1 LIMIT 1`, [value.toLowerCase()]);
        if (!res[0])
            return null;
        return {
            identifier: res[0],
            auth: { uid: res[0].uid, id: res[0].authId },
        };
    }
    async save(identifier) {
        return this.repo.save(identifier);
    }
    async markVerifiedByAuthId(authId) {
        await this.repo.query(`UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`, [authId]);
    }
};
exports.TypeOrmAuthIdentifierRepository = TypeOrmAuthIdentifierRepository;
exports.TypeOrmAuthIdentifierRepository = TypeOrmAuthIdentifierRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auth_identify_entity_1.AuthIdentifier)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmAuthIdentifierRepository);
//# sourceMappingURL=auth-identifier.repository.js.map
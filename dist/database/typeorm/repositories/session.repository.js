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
var TypeOrmSessionRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeOrmSessionRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("../entities/session.entity");
let TypeOrmSessionRepository = TypeOrmSessionRepository_1 = class TypeOrmSessionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.create(data);
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findDeviceSession(uid, namespace, deviceFingerprint) {
        const where = { uid, deviceFingerprint };
        if (namespace !== undefined) {
            where.namespace = namespace;
        }
        return this.repo.findOne({ where });
    }
    async findByUid(uid) {
        return this.repo.find({ where: { uid } });
    }
    async findByIdWithDetails(id, namespace) {
        const where = { id };
        if (namespace !== undefined) {
            where.namespace = namespace;
        }
        return this.repo.findOne({
            where,
            select: [
                'id',
                'uid',
                'refreshTokenHash',
                'expiresAt',
                'deviceFingerprint',
                'ipAddress',
                'namespace',
            ],
        });
    }
    async save(session) {
        return this.repo.save(session);
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
    async transaction(runInTransaction) {
        await this.repo.manager.transaction(async (manager) => {
            const transactionalRepo = new TypeOrmSessionRepository_1(manager.getRepository(session_entity_1.Session));
            await runInTransaction(transactionalRepo);
        });
    }
};
exports.TypeOrmSessionRepository = TypeOrmSessionRepository;
exports.TypeOrmSessionRepository = TypeOrmSessionRepository = TypeOrmSessionRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmSessionRepository);
//# sourceMappingURL=session.repository.js.map
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
exports.TypeOrmOtpTokenRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const otp_token_entity_1 = require("../entities/otp-token.entity");
let TypeOrmOtpTokenRepository = class TypeOrmOtpTokenRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }
    async findLatestUnused(uid) {
        return this.repo.findOne({
            where: { requestUserId: uid, isUsed: false },
            order: { createdAt: 'DESC' },
        });
    }
    async findLatestUnusedByPurpose(uid, purpose) {
        return this.repo.findOne({
            where: { requestUserId: uid, purpose, isUsed: false },
            order: { createdAt: 'DESC' },
        });
    }
    async save(token) {
        return this.repo.save(token);
    }
    async deleteByUid(uid) {
        await this.repo.delete({ requestUserId: uid });
    }
};
exports.TypeOrmOtpTokenRepository = TypeOrmOtpTokenRepository;
exports.TypeOrmOtpTokenRepository = TypeOrmOtpTokenRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(otp_token_entity_1.OtpToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmOtpTokenRepository);
//# sourceMappingURL=otp-token.repository.js.map
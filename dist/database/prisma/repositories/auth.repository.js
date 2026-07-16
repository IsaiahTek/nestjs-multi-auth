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
exports.PrismaAuthRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaAuthRepository = class PrismaAuthRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const { identifiers, ...rest } = data;
        return this.prisma.auth.create({
            data: {
                ...rest,
                identifiers: identifiers ? { create: identifiers } : undefined,
            },
            include: { identifiers: true }
        });
    }
    async findById(id) { return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } }); }
    async findByUid(uid) { return this.prisma.auth.findUnique({ where: { uid }, include: { identifiers: true } }); }
    async findAllByUid(uid) { return this.prisma.auth.findMany({ where: { uid } }); }
    async findAll() { return this.prisma.auth.findMany(); }
    async findByUidAndStrategy(uid, strategy) { return this.prisma.auth.findFirst({ where: { uid, strategy } }); }
    async findByUidAndStrategies(uid, strategies) { return this.prisma.auth.findFirst({ where: { uid, strategy: { in: strategies } } }); }
    async save(auth) {
        const { identifiers, oauthProviders, sessions, mfaMethods, lastUsedAt, meta, ...rest } = auth;
        return this.prisma.auth.update({ where: { id: auth.id }, data: rest });
    }
    async update(id, data) {
        const { identifiers, oauthProviders, sessions, mfaMethods, lastUsedAt, meta, ...rest } = data;
        await this.prisma.auth.update({ where: { id }, data: rest });
    }
    async delete(id) { await this.prisma.auth.delete({ where: { id } }); }
    async deleteByUid(uid) { await this.prisma.auth.deleteMany({ where: { uid } }); }
    async findWithIdentifiers(id) { return this.prisma.auth.findUnique({ where: { id }, include: { identifiers: true } }); }
};
exports.PrismaAuthRepository = PrismaAuthRepository;
exports.PrismaAuthRepository = PrismaAuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaAuthRepository);
//# sourceMappingURL=auth.repository.js.map
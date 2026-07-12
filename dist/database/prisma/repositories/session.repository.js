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
exports.PrismaSessionRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaSessionRepository = class PrismaSessionRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) { return this.prisma.session.create({ data: data }); }
    async findById(id) { return this.prisma.session.findUnique({ where: { id } }); }
    async findDeviceSession(uid, namespace, deviceFingerprint) {
        // simplified lookup since Prisma cannot easily query inside Json without raw queries across different DBs.
        return this.prisma.session.findFirst({ where: { uid } });
    }
    async findByUid(uid) { return this.prisma.session.findMany({ where: { uid } }); }
    async findByIdWithDetails(id, namespace) { return this.prisma.session.findUnique({ where: { id } }); }
    async save(session) { return this.prisma.session.update({ where: { id: session.id }, data: session }); }
    async update(id, data) { await this.prisma.session.update({ where: { id }, data: data }); }
    async delete(id) { await this.prisma.session.delete({ where: { id } }); }
    async deleteByUid(uid) { await this.prisma.session.deleteMany({ where: { uid } }); }
    async transaction(runInTransaction) { await runInTransaction(this); }
};
exports.PrismaSessionRepository = PrismaSessionRepository;
exports.PrismaSessionRepository = PrismaSessionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaSessionRepository);
//# sourceMappingURL=session.repository.js.map
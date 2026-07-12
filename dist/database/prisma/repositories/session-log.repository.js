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
exports.PrismaSessionLogRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaSessionLogRepository = class PrismaSessionLogRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async save(data) { return this.prisma.sessionLog.update({ where: { id: data.id }, data: data }); }
    async saveMany(data) { return Promise.all(data.map(d => this.save(d))); }
    async create(data) {
        return this.prisma.sessionLog.create({ data: data });
    }
    async findByUid(uid) { return this.prisma.sessionLog.findMany({ where: { uid } }); }
    async transaction(callback) { return callback(this); }
    async findByUidAndNamespace(uid, namespace) {
        return this.prisma.sessionLog.findMany({
            where: { uid, namespace },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
};
exports.PrismaSessionLogRepository = PrismaSessionLogRepository;
exports.PrismaSessionLogRepository = PrismaSessionLogRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaSessionLogRepository);
//# sourceMappingURL=session-log.repository.js.map
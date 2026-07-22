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
exports.PrismaOtpTokenRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaOtpTokenRepository = class PrismaOtpTokenRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.otpToken.create({ data: data });
    }
    async save(data) {
        return this.prisma.otpToken.update({
            where: { id: data.id },
            data: data,
        });
    }
    async delete(id) { await this.prisma.otpToken.delete({ where: { id } }); }
    async deleteByUid(uid) { await this.prisma.otpToken.deleteMany({ where: { uid } }); }
    async transaction(callback) { return callback(this); }
    async findLatestUnused(uid) {
        return this.prisma.otpToken.findFirst({
            where: { requestUserId: uid, isUsed: false },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findLatestUnusedByPurpose(uid, purpose) {
        return this.prisma.otpToken.findFirst({
            where: { requestUserId: uid, purpose, isUsed: false },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PrismaOtpTokenRepository = PrismaOtpTokenRepository;
exports.PrismaOtpTokenRepository = PrismaOtpTokenRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaOtpTokenRepository);
//# sourceMappingURL=otp-token.repository.js.map
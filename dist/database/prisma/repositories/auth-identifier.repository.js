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
exports.PrismaAuthIdentifierRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaAuthIdentifierRepository = class PrismaAuthIdentifierRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const { auth, ...rest } = data;
        const createData = { ...rest };
        if (auth && auth.id)
            createData.auth = { connect: { id: auth.id } };
        return this.prisma.authIdentifier.create({ data: createData });
    }
    async findByValue(value) { return this.prisma.authIdentifier.findUnique({ where: { value } }); }
    async findByAuthId(authId) { return this.prisma.authIdentifier.findMany({ where: { authId } }); }
    async findByUidAndTypes(uid, types) { return this.prisma.authIdentifier.findFirst({ where: { auth: { uid }, type: { in: types } } }); }
    async findWithAuthByValue(value) {
        const res = await this.prisma.authIdentifier.findUnique({ where: { value }, include: { auth: true } });
        if (!res)
            return null;
        const { auth, ...identifier } = res;
        return { identifier: identifier, auth: auth };
    }
    async save(identifier) {
        const { auth, ...rest } = identifier;
        return this.prisma.authIdentifier.update({ where: { id: identifier.id }, data: rest });
    }
    async markVerifiedByAuthId(authId) { await this.prisma.authIdentifier.updateMany({ where: { authId }, data: { isVerified: true } }); }
};
exports.PrismaAuthIdentifierRepository = PrismaAuthIdentifierRepository;
exports.PrismaAuthIdentifierRepository = PrismaAuthIdentifierRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaAuthIdentifierRepository);
//# sourceMappingURL=auth-identifier.repository.js.map
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
exports.PrismaMfaMethodRepository = void 0;
const common_1 = require("@nestjs/common");
let PrismaMfaMethodRepository = class PrismaMfaMethodRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const { auth, ...rest } = data;
        const createData = { ...rest };
        if (auth && auth.id) {
            createData.authId = auth.id;
        }
        else if (data.uid) {
            createData.auth = { connect: { uid: data.uid } };
        }
        return this.prisma.mfaMethod.create({ data: createData });
    }
    async findByUidAndType(uid, type) { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, type } }); }
    async findByUidAndEnabled(uid) { return this.prisma.mfaMethod.findFirst({ where: { auth: { uid }, isEnabled: true } }); }
    async save(method) {
        const { auth, authId, uid, ...rest } = method;
        return this.prisma.mfaMethod.update({ where: { id: method.id }, data: rest });
    }
    async deleteByUid(uid) { await this.prisma.mfaMethod.deleteMany({ where: { auth: { uid } } }); }
};
exports.PrismaMfaMethodRepository = PrismaMfaMethodRepository;
exports.PrismaMfaMethodRepository = PrismaMfaMethodRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PRISMA_SERVICE_TOKEN')),
    __metadata("design:paramtypes", [Object])
], PrismaMfaMethodRepository);
//# sourceMappingURL=mfa-method.repository.js.map
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
var PasswordAuthStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const auth_entity_1 = require("../entities/auth.entity");
const auth_identify_entity_1 = require("../entities/auth-identify.entity");
const auth_type_enum_1 = require("../auth-type.enum");
let PasswordAuthStrategy = PasswordAuthStrategy_1 = class PasswordAuthStrategy {
    constructor(dataSource, authRepo, identifierRepo) {
        this.dataSource = dataSource;
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.logger = new common_1.Logger(PasswordAuthStrategy_1.name);
    }
    async registerCredentials(dto, uid) {
        if (!dto.email && !dto.phone && !dto.username) {
            throw new common_1.BadRequestException('Email, phone or username is required');
        }
        if (!dto.password) {
            throw new common_1.BadRequestException('Password is required');
        }
        const identifiersToCheck = [];
        if (dto.email)
            identifiersToCheck.push(dto.email.toLowerCase());
        if (dto.phone)
            identifiersToCheck.push(dto.phone);
        if (dto.username)
            identifiersToCheck.push(dto.username.toLowerCase());
        return this.dataSource.transaction(async (manager) => {
            const authIdentifierRepo = manager.getRepository(auth_identify_entity_1.AuthIdentifier);
            const authRepo = manager.getRepository(auth_entity_1.Auth);
            const existing = await authIdentifierRepo.findOne({
                where: { value: (0, typeorm_1.In)(identifiersToCheck) },
            });
            if (existing) {
                throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing email, phone or username');
            }
            const hash = await bcrypt.hash(dto.password, 10);
            const identityUid = uid || crypto.randomUUID();
            const newAuth = authRepo.create({
                uid: identityUid,
                strategy: dto.method || auth_type_enum_1.AuthStrategy.LOCAL,
                secretHash: hash,
                isActive: true,
                isPrimary: true,
            });
            const newIdentifiers = [];
            if (dto.email) {
                newIdentifiers.push(authIdentifierRepo.create({
                    type: auth_identify_entity_1.IdentifierType.EMAIL,
                    value: dto.email.toLowerCase(),
                }));
            }
            if (dto.phone) {
                newIdentifiers.push(authIdentifierRepo.create({
                    type: auth_identify_entity_1.IdentifierType.PHONE,
                    value: dto.phone,
                }));
            }
            if (dto.username) {
                newIdentifiers.push(authIdentifierRepo.create({
                    type: auth_identify_entity_1.IdentifierType.USERNAME,
                    value: dto.username.toLowerCase(),
                }));
            }
            newAuth.identifiers = newIdentifiers;
            return await authRepo.save(newAuth);
        });
    }
    async login(dto) {
        if (!dto.password) {
            throw new common_1.BadRequestException('Password is required');
        }
        const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;
        if (!identifierValue) {
            throw new common_1.BadRequestException('Email, phone or username is required');
        }
        const identifier = await this.identifierRepo.findOne({
            where: { value: identifierValue.toLowerCase() },
            relations: ['auth'],
        });
        if (!identifier || !identifier.auth) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const auth = identifier.auth;
        if (auth.strategy !== auth_type_enum_1.AuthStrategy.LOCAL) {
            throw new common_1.UnauthorizedException('Please login with your Social Account');
        }
        const authWithSecret = await this.authRepo.findOne({
            where: { id: auth.id },
            select: ['id', 'secretHash'],
        });
        if (!authWithSecret || !authWithSecret.secretHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(dto.password, authWithSecret.secretHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        return auth;
    }
};
exports.PasswordAuthStrategy = PasswordAuthStrategy;
exports.PasswordAuthStrategy = PasswordAuthStrategy = PasswordAuthStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(auth_entity_1.Auth)),
    __param(2, (0, typeorm_2.InjectRepository)(auth_identify_entity_1.AuthIdentifier)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository,
        typeorm_1.Repository])
], PasswordAuthStrategy);
//# sourceMappingURL=password.strategy.js.map
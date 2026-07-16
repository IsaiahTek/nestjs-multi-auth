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
var LocalAuthStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const auth_module_options_interface_1 = require("../interfaces/auth-module-options.interface");
const repository_tokens_1 = require("../interfaces/repository-tokens");
const identifier_type_enum_1 = require("../enums/identifier-type.enum");
// Enums
const auth_type_enum_1 = require("../enums/auth-type.enum");
let LocalAuthStrategy = LocalAuthStrategy_1 = class LocalAuthStrategy {
    constructor(authRepo, identifierRepo, options) {
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.options = options;
        this.logger = new common_1.Logger(LocalAuthStrategy_1.name);
    }
    validatePhoneFormat(phone) {
        const prefixes = this.options.allowedPhonePrefixes;
        if (!prefixes || prefixes.length === 0)
            return;
        const matches = prefixes.some((prefix) => phone.startsWith(prefix));
        if (!matches) {
            throw new common_1.BadRequestException(`Phone number must start with ${prefixes.length > 1 ? 'one of these prefixes' : 'this prefix'}: ${prefixes.join(', ')}`);
        }
    }
    requiresPassword(type) {
        switch (type) {
            case identifier_type_enum_1.IdentifierType.EMAIL:
            case 'EMAIL':
                return this.options.emailRequiresPassword ?? true;
            case identifier_type_enum_1.IdentifierType.PHONE:
            case 'PHONE':
                return this.options.phoneRequiresPassword ?? false;
            case identifier_type_enum_1.IdentifierType.USERNAME:
            case 'USERNAME':
                return this.options.usernameRequiresPassword ?? true;
            default:
                return true;
        }
    }
    async registerCredentials(dto, uid) {
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        if (dto.email && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.EMAIL) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Email authentication is currently disabled.');
        }
        if (dto.phone && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.PHONE) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Phone authentication is currently disabled.');
        }
        if (dto.username && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.USERNAME) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Username authentication is currently disabled.');
        }
        if (!dto.email && !dto.phone && !dto.username) {
            throw new common_1.BadRequestException('Email, phone or username is required');
        }
        if (dto.phone) {
            this.validatePhoneFormat(dto.phone);
        }
        const emailReq = dto.email ? this.requiresPassword('EMAIL') : false;
        const phoneReq = dto.phone ? this.requiresPassword('PHONE') : false;
        const userReq = dto.username ? this.requiresPassword('USERNAME') : false;
        const passwordRequired = emailReq || phoneReq || userReq;
        if (!dto.password && passwordRequired) {
            throw new common_1.BadRequestException('Password is required');
        }
        const identifiersToCheck = [];
        if (dto.email)
            identifiersToCheck.push(dto.email.toLowerCase());
        if (dto.phone)
            identifiersToCheck.push(dto.phone);
        if (dto.username)
            identifiersToCheck.push(dto.username.toLowerCase());
        for (const val of identifiersToCheck) {
            const existing = await this.identifierRepo.findByValue(val);
            if (existing) {
                if (existing.type === identifier_type_enum_1.IdentifierType.PHONE) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing phone number');
                }
                if (existing.type === identifier_type_enum_1.IdentifierType.EMAIL) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing email');
                }
                if (existing.type === identifier_type_enum_1.IdentifierType.USERNAME) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing username');
                }
            }
        }
        const hash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
        const identityUid = uid || crypto.randomUUID();
        const newAuth = await this.authRepo.create({
            uid: identityUid,
            strategy: dto.method || auth_type_enum_1.AuthStrategy.LOCAL,
            secretHash: hash,
            isActive: true,
            isPrimary: true,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const newIdentifiers = [];
        if (dto.email) {
            newIdentifiers.push(await this.identifierRepo.create({
                auth: newAuth,
                type: identifier_type_enum_1.IdentifierType.EMAIL,
                value: dto.email.toLowerCase(),
                isVerified: false,
                source: identifier_type_enum_1.IdentifierSource.LOCAL,
            }));
        }
        if (dto.phone) {
            newIdentifiers.push(await this.identifierRepo.create({
                auth: newAuth,
                type: identifier_type_enum_1.IdentifierType.PHONE,
                value: dto.phone,
                isVerified: false,
                source: identifier_type_enum_1.IdentifierSource.LOCAL,
            }));
        }
        if (dto.username) {
            newIdentifiers.push(await this.identifierRepo.create({
                auth: newAuth,
                type: identifier_type_enum_1.IdentifierType.USERNAME,
                value: dto.username.toLowerCase(),
                isVerified: false,
                source: identifier_type_enum_1.IdentifierSource.LOCAL,
            }));
        }
        newAuth.identifiers = newIdentifiers;
        const auth = await this.authRepo.save(newAuth);
        return { auth, identifier: auth.identifiers?.[0] };
    }
    async login(dto) {
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;
        if (!identifierValue) {
            throw new common_1.BadRequestException('Email, phone or username is required');
        }
        const isEmail = !!dto.email || (!!dto.emailOrPhone && dto.emailOrPhone.includes('@'));
        const isPhone = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
        const isUsername = !!dto.username || (!isEmail && !isPhone);
        const passwordRequired = (isEmail && this.requiresPassword('EMAIL')) ||
            (isPhone && this.requiresPassword('PHONE')) ||
            (isUsername && this.requiresPassword('USERNAME'));
        if (!dto.password && passwordRequired) {
            throw new common_1.BadRequestException('Password is required');
        }
        if (isEmail && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.EMAIL) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Email authentication is currently disabled.');
        }
        if (isPhone && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.PHONE) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Phone authentication is currently disabled.');
        }
        if (isPhone) {
            this.validatePhoneFormat(identifierValue);
        }
        if (isUsername && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.USERNAME) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Username authentication is currently disabled.');
        }
        const result = await this.identifierRepo.findWithAuthByValue(identifierValue.toLowerCase());
        if (!result || !result.auth) {
            throw new common_1.UnauthorizedException(`Invalid credentials (not found). Ident: ${identifierValue}`);
        }
        const identifier = result.identifier;
        const auth = result.auth;
        const localStrategies = [
            auth_type_enum_1.AuthStrategy.EMAIL,
            auth_type_enum_1.AuthStrategy.PHONE,
            auth_type_enum_1.AuthStrategy.USERNAME,
            auth_type_enum_1.AuthStrategy.LOCAL,
        ];
        if (!localStrategies.includes(auth.strategy)) {
            this.logger.log(`User tried to login with ${auth.strategy} strategy`);
            throw new common_1.UnauthorizedException('Please login with your Social Account');
        }
        if (dto.password && auth.secretHash) {
            const valid = await bcrypt.compare(dto.password, auth.secretHash);
            if (!valid) {
                throw new common_1.UnauthorizedException(`Invalid credentials (bcrypt). Hash length: ${auth.secretHash.length}, Pwd length: ${dto.password.length}`);
            }
        }
        else if (dto.password && !auth.secretHash) {
            throw new common_1.UnauthorizedException('This account does not have a password set. Please use another method.');
        }
        else if (!dto.password && auth.secretHash) {
            throw new common_1.UnauthorizedException('Password is required for this account');
        }
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        return { auth, identifier };
    }
};
exports.LocalAuthStrategy = LocalAuthStrategy;
exports.LocalAuthStrategy = LocalAuthStrategy = LocalAuthStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.AUTH_REPOSITORY_TOKEN)),
    __param(1, (0, common_1.Inject)(repository_tokens_1.AUTH_IDENTIFIER_REPOSITORY_TOKEN)),
    __param(2, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object, Object])
], LocalAuthStrategy);
//# sourceMappingURL=local-auth.strategy.js.map
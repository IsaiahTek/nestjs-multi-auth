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
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const auth_module_options_interface_1 = require("../interfaces/auth-module-options.interface");
const common_2 = require("@nestjs/common");
// Entities
const auth_entity_1 = require("../entities/auth.entity");
const auth_identify_entity_1 = require("../entities/auth-identify.entity");
// Enums
const auth_type_enum_1 = require("../auth-type.enum"); // Ensure this path is correct
// Services / DTOs
let LocalAuthStrategy = LocalAuthStrategy_1 = class LocalAuthStrategy {
    constructor(dataSource, authRepo, identifierRepo, options) {
        this.dataSource = dataSource;
        this.authRepo = authRepo;
        this.identifierRepo = identifierRepo;
        this.options = options;
        this.logger = new common_1.Logger(LocalAuthStrategy_1.name);
    }
    async registerCredentials(dto, uid) {
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        // 1. Validation of identifiers against enabled strategies
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
        const isPhoneSignUp = !!dto.phone;
        const phoneRequiresPassword = this.options.phoneRequiresPassword ?? false;
        if (!dto.password && (!isPhoneSignUp || phoneRequiresPassword)) {
            throw new common_1.BadRequestException('Password is required');
        }
        // 2. Prepare the list of identifiers we want to claim
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
            // 3. 🔒 Check uniqueness
            const existing = await authIdentifierRepo.findOne({
                where: { value: (0, typeorm_1.In)(identifiersToCheck) },
            });
            if (existing) {
                if (existing.type === auth_identify_entity_1.IdentifierType.PHONE) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing phone number');
                }
                if (existing.type === auth_identify_entity_1.IdentifierType.EMAIL) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing email');
                }
                if (existing.type === auth_identify_entity_1.IdentifierType.USERNAME) {
                    throw new common_1.BadRequestException('Unable to signup with those credentials. Try changing username');
                }
            }
            // 4. Hash Password (if provided)
            const hash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
            // 5. Create the Auth Identity
            // If no uid is provided, this is a completely new account.
            // Generation will happen here or in AuthService if we want more control.
            // Let's generate it here if missing.
            const identityUid = uid || crypto.randomUUID();
            const newAuth = authRepo.create({
                uid: identityUid,
                strategy: dto.method || auth_type_enum_1.AuthStrategy.LOCAL,
                secretHash: hash,
                isActive: true,
                isPrimary: true,
            });
            // 7. Create the Identifiers (The "Lookups")
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
            // Attach identifiers to auth to save them together (Cascade)
            newAuth.identifiers = newIdentifiers;
            // 8. Save (Cascade will save Auth + Identifiers)
            const auth = await authRepo.save(newAuth);
            return { auth, identifier: auth.identifiers?.[0] };
        });
    }
    async login(dto) {
        const isPhoneLogin = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
        const phoneRequiresPassword = this.options.phoneRequiresPassword ?? false;
        if (!dto.password && (!isPhoneLogin || phoneRequiresPassword)) {
            throw new common_1.BadRequestException('Password is required');
        }
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_1.AuthStrategy);
        const identifierValue = dto.emailOrPhone || dto.email || dto.phone || dto.username;
        if (!identifierValue) {
            throw new common_1.BadRequestException('Email, phone or username is required');
        }
        // Validate identifier type against enabled strategies
        const isEmail = !!dto.email || (!!dto.emailOrPhone && dto.emailOrPhone.includes('@'));
        const isPhone = !!dto.phone || (!!dto.emailOrPhone && /^\+?[0-9]+$/.test(dto.emailOrPhone));
        const isUsername = !!dto.username || (!isEmail && !isPhone);
        if (isEmail && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.EMAIL) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Email authentication is currently disabled.');
        }
        if (isPhone && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.PHONE) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Phone authentication is currently disabled.');
        }
        if (isUsername && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.USERNAME) && !enabledStrategies.includes(auth_type_enum_1.AuthStrategy.LOCAL)) {
            throw new common_1.BadRequestException('Username authentication is currently disabled.');
        }
        // 1. Look up the Identifier first (e.g., find row where value = "john@gmail.com")
        // We join 'auth' and 'auth.user' so we have everything we need.
        const identifier = await this.identifierRepo.findOne({
            where: { value: identifierValue.toLowerCase() },
            relations: ['auth'],
        });
        if (!identifier || !identifier.auth) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const auth = identifier.auth;
        // 2. Safety Check: Ensure this identifier is actually linked to a Password account
        if (auth.strategy !== auth_type_enum_1.AuthStrategy.LOCAL) {
            throw new common_1.UnauthorizedException('Please login with your Social Account');
        }
        // 3. Retrieve the password hash
        // (Since select: false, it wasn't loaded in the relation above. We must explicitly fetch it)
        const authWithSecret = await this.authRepo.findOne({
            where: { id: auth.id },
            select: ['id', 'secretHash'], // Explicitly select the hidden column
        });
        if (!authWithSecret) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        // 4. Verify password (if password was provided or required)
        if (dto.password && authWithSecret.secretHash) {
            const valid = await bcrypt.compare(dto.password, authWithSecret.secretHash);
            if (!valid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
        }
        else if (dto.password && !authWithSecret.secretHash) {
            // Identity has no password, but one was provided
            throw new common_1.UnauthorizedException('This account does not have a password set. Please use another method.');
        }
        else if (!dto.password && authWithSecret.secretHash) {
            // Identity has a password, but none was provided
            throw new common_1.UnauthorizedException('Password is required for this account');
        }
        // If neither has a password, it's a password-less login (allowed for phone if verified elsewhere/contextually)
        // 5. Update usage stats
        // We update the original 'auth' object which has the User loaded, to return full context
        auth.lastUsedAt = new Date();
        await this.authRepo.save(auth);
        return { auth, identifier };
    }
};
exports.LocalAuthStrategy = LocalAuthStrategy;
exports.LocalAuthStrategy = LocalAuthStrategy = LocalAuthStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(auth_entity_1.Auth)),
    __param(2, (0, typeorm_2.InjectRepository)(auth_identify_entity_1.AuthIdentifier)),
    __param(3, (0, common_2.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository,
        typeorm_1.Repository, Object])
], LocalAuthStrategy);
//# sourceMappingURL=local-auth.strategy.js.map
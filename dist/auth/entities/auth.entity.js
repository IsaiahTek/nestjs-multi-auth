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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const base_entity_1 = require("./base.entity");
const auth_identify_entity_1 = require("./auth-identify.entity");
const oauth_provider_entity_1 = require("./oauth-provider.entity");
const auth_type_enum_1 = require("../auth-type.enum");
let Auth = class Auth extends base_entity_1.BaseEntity {
    toMap() {
        return {
            id: this.id,
            strategy: this.strategy,
            isActive: this.isActive,
            isVerified: this.isVerified,
            isPrimary: this.isPrimary,
            meta: this.meta,
            lastUsedAt: this.lastUsedAt,
            // user: this.user.toMap(),
            identifiers: this.identifiers.map((id) => id.toMap()),
            oauthProvider: this.oauthProvider?.toMap(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt,
        };
    }
};
exports.Auth = Auth;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identity ID (UID) of this account. Multiple auth methods can share the same UID.',
        type: 'string',
        example: 'uuid-string',
    }),
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Auth.prototype, "uid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: auth_type_enum_1.AuthStrategy }),
    __metadata("design:type", String)
], Auth.prototype, "strategy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => auth_identify_entity_1.AuthIdentifier, (identifier) => identifier.auth, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Auth.prototype, "identifiers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '$2b$10$hashedpassword...',
        description: 'Hashed secret (password, TOTP secret). Null for OAuth',
        nullable: true,
    }),
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], Auth.prototype, "secretHash", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: true,
        description: 'Primary login method for the user',
    }),
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Auth.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: true,
        description: 'Whether the identifier is verified',
    }),
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Auth.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: true,
        description: 'Whether this auth method is enabled',
    }),
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Auth.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: { device: 'iPhone', ip: '192.168.1.1' },
        description: 'Additional metadata (JSON)',
    }),
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Auth.prototype, "meta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2025-09-30T12:00:00Z',
        description: 'Last successful usage timestamp',
    }),
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Auth.prototype, "lastUsedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: () => oauth_provider_entity_1.OAuthProvider,
        description: 'OAuth provider details (only for OAUTH method)',
        required: false,
    }),
    (0, typeorm_1.OneToOne)(() => oauth_provider_entity_1.OAuthProvider, (provider) => provider.auth, {
        cascade: true,
        nullable: true,
    }),
    __metadata("design:type", oauth_provider_entity_1.OAuthProvider)
], Auth.prototype, "oauthProvider", void 0);
exports.Auth = Auth = __decorate([
    (0, typeorm_1.Entity)('auth'),
    (0, typeorm_1.Index)('IDX_user_primary_auth', ['uid'], {
        unique: true,
        where: `"isPrimary" = true`,
    }),
    (0, typeorm_1.Index)(['strategy']),
    (0, typeorm_1.Index)(['isActive'])
], Auth);
//# sourceMappingURL=auth.entity.js.map
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
exports.OAuthProvider = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const base_entity_1 = require("./base.entity");
const auth_entity_1 = require("./auth.entity");
const auth_type_enum_1 = require("../auth-type.enum");
let OAuthProvider = class OAuthProvider extends base_entity_1.BaseEntity {
    toMap() {
        return {
            id: this.id,
            provider: this.provider,
            providerUserId: this.providerUserId,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt,
        };
    }
};
exports.OAuthProvider = OAuthProvider;
__decorate([
    (0, typeorm_1.OneToOne)(() => auth_entity_1.Auth, (auth) => auth.oauthProvider, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", auth_entity_1.Auth)
], OAuthProvider.prototype, "auth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: auth_type_enum_1.OAuthProviderType, example: auth_type_enum_1.OAuthProviderType.GOOGLE }),
    (0, typeorm_1.Column)({ type: 'enum', enum: auth_type_enum_1.OAuthProviderType }),
    __metadata("design:type", String)
], OAuthProvider.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1234567890' }),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OAuthProvider.prototype, "providerUserId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ya29.a0ARrdaM...' }),
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], OAuthProvider.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1//0gdf1234...' }),
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], OAuthProvider.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-10-01T12:00:00Z' }),
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], OAuthProvider.prototype, "expiresAt", void 0);
exports.OAuthProvider = OAuthProvider = __decorate([
    (0, typeorm_1.Entity)()
], OAuthProvider);
//# sourceMappingURL=oauth-provider.entity.js.map
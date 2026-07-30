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
exports.OAuthProviderResponseDto = void 0;
// oauth-provider-response.dto.ts
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const auth_type_enum_1 = require("../../enums/auth-type.enum");
class OAuthProviderResponseDto {
}
exports.OAuthProviderResponseDto = OAuthProviderResponseDto;
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)({ enum: auth_type_enum_1.OAuthProviderType }),
    __metadata("design:type", String)
], OAuthProviderResponseDto.prototype, "provider", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OAuthProviderResponseDto.prototype, "providerUserId", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], OAuthProviderResponseDto.prototype, "expiresAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OAuthProviderResponseDto.prototype, "displayName", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OAuthProviderResponseDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], OAuthProviderResponseDto.prototype, "emailVerified", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], OAuthProviderResponseDto.prototype, "rawProfile", void 0);

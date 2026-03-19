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
exports.AuthResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const auth_type_enum_1 = require("../enums/auth-type.enum");
const class_transformer_1 = require("class-transformer");
const identifier_response_dto_1 = require("./identifier-response.dto");
const oauth_provider_response_dto_1 = require("./oauth-provider-response.dto");
class AuthResponseDto {
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "id", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "uid", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)({ enum: auth_type_enum_1.AuthStrategy }),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "strategy", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], AuthResponseDto.prototype, "isPrimary", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], AuthResponseDto.prototype, "isVerified", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], AuthResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], AuthResponseDto.prototype, "meta", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], AuthResponseDto.prototype, "lastUsedAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => identifier_response_dto_1.AuthIdentifierDto),
    __metadata("design:type", Array)
], AuthResponseDto.prototype, "identifiers", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, class_transformer_1.Type)(() => oauth_provider_response_dto_1.OAuthProviderResponseDto),
    (0, swagger_1.ApiProperty)({ type: oauth_provider_response_dto_1.OAuthProviderResponseDto, required: false }),
    __metadata("design:type", oauth_provider_response_dto_1.OAuthProviderResponseDto)
], AuthResponseDto.prototype, "oauthProvider", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AuthResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AuthResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=auth-response.dto.js.map
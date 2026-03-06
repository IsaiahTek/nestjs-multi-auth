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
exports.LoginDto = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const auth_type_enum_1 = require("../auth-type.enum");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: auth_type_enum_1.AuthStrategy,
        example: auth_type_enum_1.AuthStrategy.LOCAL,
        description: 'Authentication method chosen by the user',
        type: () => auth_type_enum_1.AuthStrategy,
    }),
    (0, class_validator_1.IsEnum)(auth_type_enum_1.AuthStrategy),
    __metadata("design:type", String)
], LoginDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: auth_type_enum_1.OAuthProviderType,
        example: auth_type_enum_1.OAuthProviderType.GOOGLE,
        description: 'OAuth provider (required if method is OAUTH)',
        required: false,
    }),
    (0, class_validator_1.IsEnum)(auth_type_enum_1.OAuthProviderType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "emailOrPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john@example.com', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2347035742844', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john_doe', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "token", void 0);
//# sourceMappingURL=login.dto.js.map
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
exports.ActivateMfaDto = exports.EnrollMfaDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const mfa_method_entity_1 = require("../entities/mfa-method.entity");
class EnrollMfaDto {
}
exports.EnrollMfaDto = EnrollMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The type of MFA to enroll (e.g., TOTP)',
        enum: mfa_method_entity_1.MfaType,
        example: mfa_method_entity_1.MfaType.TOTP,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(mfa_method_entity_1.MfaType),
    __metadata("design:type", String)
], EnrollMfaDto.prototype, "type", void 0);
class ActivateMfaDto {
}
exports.ActivateMfaDto = ActivateMfaDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The type of MFA to activate',
        enum: mfa_method_entity_1.MfaType,
        example: mfa_method_entity_1.MfaType.TOTP,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(mfa_method_entity_1.MfaType),
    __metadata("design:type", String)
], ActivateMfaDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The verification code from the MFA app',
        example: '123456',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivateMfaDto.prototype, "code", void 0);
//# sourceMappingURL=mfa.dto.js.map
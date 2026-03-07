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
exports.OtpToken = exports.OtpPurpose = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
var OtpPurpose;
(function (OtpPurpose) {
    OtpPurpose["VERIFY_EMAIL"] = "VERIFY_EMAIL";
    OtpPurpose["VERIFY_PHONE"] = "VERIFY_PHONE";
    OtpPurpose["PASSWORD_RESET"] = "PASSWORD_RESET";
    OtpPurpose["LOGIN_2FA"] = "LOGIN_2FA";
})(OtpPurpose || (exports.OtpPurpose = OtpPurpose = {}));
let OtpToken = class OtpToken extends base_entity_1.BaseEntity {
};
exports.OtpToken = OtpToken;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OtpToken.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: OtpPurpose }),
    __metadata("design:type", String)
], OtpToken.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OtpToken.prototype, "codeHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], OtpToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], OtpToken.prototype, "isUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OtpToken.prototype, "requestUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OtpToken.prototype, "requestAuthId", void 0);
exports.OtpToken = OtpToken = __decorate([
    (0, typeorm_1.Entity)('otp_tokens')
    // Index makes lookup fast: "Find latest unused OTP for john@gmail.com"
    ,
    (0, typeorm_1.Index)(['identifier', 'purpose', 'isUsed'])
], OtpToken);
//# sourceMappingURL=otp-token.entity.js.map
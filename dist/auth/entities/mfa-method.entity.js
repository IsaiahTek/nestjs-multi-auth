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
exports.MfaMethod = exports.MfaType = void 0;
const typeorm_1 = require("typeorm");
var MfaType;
(function (MfaType) {
    MfaType["TOTP"] = "TOTP";
    MfaType["SMS"] = "SMS";
    MfaType["EMAIL"] = "EMAIL";
})(MfaType || (exports.MfaType = MfaType = {}));
let MfaMethod = class MfaMethod {
    toMap() {
        return {
            id: this.id,
            type: this.type,
            isEnabled: this.isEnabled,
            isDefault: this.isDefault,
            lastUsedAt: this.lastUsedAt,
            createdAt: this.createdAt,
        };
    }
};
exports.MfaMethod = MfaMethod;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MfaMethod.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MfaMethod.prototype, "uid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MfaType }),
    __metadata("design:type", String)
], MfaMethod.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false }),
    __metadata("design:type", String)
], MfaMethod.prototype, "secret", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MfaMethod.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MfaMethod.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], MfaMethod.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MfaMethod.prototype, "createdAt", void 0);
exports.MfaMethod = MfaMethod = __decorate([
    (0, typeorm_1.Entity)('auth_mfa_methods')
], MfaMethod);
//# sourceMappingURL=mfa-method.entity.js.map
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
exports.AuthIdentifier = exports.IdentifierType = void 0;
const typeorm_1 = require("typeorm");
const auth_entity_1 = require("./auth.entity");
const base_entity_1 = require("./base.entity");
var IdentifierType;
(function (IdentifierType) {
    IdentifierType["EMAIL"] = "EMAIL";
    IdentifierType["PHONE"] = "PHONE";
    IdentifierType["USERNAME"] = "USERNAME";
})(IdentifierType || (exports.IdentifierType = IdentifierType = {}));
let AuthIdentifier = class AuthIdentifier extends base_entity_1.BaseEntity {
    toMap() {
        return {
            id: this.id,
            type: this.type,
            value: this.value,
            isVerified: this.isVerified,
            // auth: this.auth.toMap(),
        };
    }
};
exports.AuthIdentifier = AuthIdentifier;
__decorate([
    (0, typeorm_1.ManyToOne)(() => auth_entity_1.Auth, (auth) => auth.identifiers, { onDelete: 'CASCADE' }),
    __metadata("design:type", auth_entity_1.Auth)
], AuthIdentifier.prototype, "auth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: IdentifierType }),
    __metadata("design:type", String)
], AuthIdentifier.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AuthIdentifier.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AuthIdentifier.prototype, "isVerified", void 0);
exports.AuthIdentifier = AuthIdentifier = __decorate([
    (0, typeorm_1.Entity)('auth_identifiers')
], AuthIdentifier);
//# sourceMappingURL=auth-identify.entity.js.map
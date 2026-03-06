"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleAuthStrategy = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
const common_1 = require("@nestjs/common");
let AppleAuthStrategy = class AppleAuthStrategy {
    async registerCredentials(dto, uid) {
        // Verify apple token
        throw new Error('Apple OAuth Not implemented');
    }
    async login(dto) {
        // Verify apple token, return existing user
        throw new Error('Apple OAuth Not implemented');
    }
};
exports.AppleAuthStrategy = AppleAuthStrategy;
exports.AppleAuthStrategy = AppleAuthStrategy = __decorate([
    (0, common_1.Injectable)()
], AppleAuthStrategy);
//# sourceMappingURL=apple.strategy.js.map
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
exports.AuthCookieService = void 0;
const common_1 = require("@nestjs/common");
let AuthCookieService = class AuthCookieService {
    constructor(options) {
        this.options = options;
    }
    getNamespace(req) {
        const hostname = req.hostname;
        const parts = hostname.split(".");
        if (parts.length <= 2) {
            return "root";
        }
        return parts.slice(0, parts.length - 2).join("_");
    }
    get(req) {
        // 1. USER OVERRIDE (highest priority)
        if (this.options.cookieNameResolver) {
            return this.options.cookieNameResolver(req);
        }
        const namespace = this.getNamespace(req);
        return {
            accessTokenName: `${namespace}_access_token`,
            refreshTokenName: `${namespace}_refresh_token`,
        };
    }
};
exports.AuthCookieService = AuthCookieService;
exports.AuthCookieService = AuthCookieService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], AuthCookieService);
//# sourceMappingURL=cookie-namespace.resolver.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthContextService = void 0;
const common_1 = require("@nestjs/common");
const auth_module_options_interface_1 = require("../interfaces/auth-module-options.interface");
let AuthContextService = class AuthContextService {
    constructor(options) {
        this.options = options;
    }
    _extractNamespaceFromReq(req) {
        const hostname = req.hostname;
        const parts = hostname.split(".");
        if (parts.length <= 2) {
            return "root";
        }
        return parts.slice(0, parts.length - 2).join("_");
    }
    get(req) {
        var _a, _b, _c, _d, _e;
        // 1. USER OVERRIDE (highest priority)
        if (this.options.cookieNameResolver || this.options.authContextResolver) {
            const authContext = (_c = (_b = (_a = this.options).cookieNameResolver) === null || _b === void 0 ? void 0 : _b.call(_a, req)) !== null && _c !== void 0 ? _c : (_e = (_d = this.options).authContextResolver) === null || _e === void 0 ? void 0 : _e.call(_d, req);
            return authContext;
        }
        const namespace = this._extractNamespaceFromReq(req);
        return {
            namespace,
            accessTokenName: `${namespace}_access_token`,
            refreshTokenName: `${namespace}_refresh_token`,
        };
    }
    getNamespace(req) {
        const ns = this.get(req).namespace;
        return ns;
    }
};
exports.AuthContextService = AuthContextService;
exports.AuthContextService = AuthContextService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], AuthContextService);

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
exports.OAuthAuthStrategy = void 0;
const common_1 = require("@nestjs/common");
const auth_type_enum_1 = require("../../auth-type.enum");
const google_strategy_1 = require("./google.strategy");
const facebook_strategy_1 = require("./facebook.strategy");
const apple_strategy_1 = require("./apple.strategy");
const auth_module_options_interface_1 = require("../../interfaces/auth-module-options.interface");
const common_2 = require("@nestjs/common");
const auth_type_enum_2 = require("../../auth-type.enum");
let OAuthAuthStrategy = class OAuthAuthStrategy {
    constructor(googleStrategy, facebookStrategy, appleStrategy, options) {
        this.googleStrategy = googleStrategy;
        this.facebookStrategy = facebookStrategy;
        this.appleStrategy = appleStrategy;
        this.options = options;
    }
    getStrategy(provider) {
        const enabledStrategies = this.options.enabledStrategies || Object.values(auth_type_enum_2.AuthStrategy);
        if (provider === auth_type_enum_1.OAuthProviderType.GOOGLE && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.GOOGLE) && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.OAUTH)) {
            throw new common_1.BadRequestException('Google authentication is currently disabled.');
        }
        if (provider === auth_type_enum_1.OAuthProviderType.FACEBOOK && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.FACEBOOK) && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.OAUTH)) {
            throw new common_1.BadRequestException('Facebook authentication is currently disabled.');
        }
        if (provider === auth_type_enum_1.OAuthProviderType.APPLE && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.APPLE) && !enabledStrategies.includes(auth_type_enum_2.AuthStrategy.OAUTH)) {
            throw new common_1.BadRequestException('Apple authentication is currently disabled.');
        }
        switch (provider) {
            case auth_type_enum_1.OAuthProviderType.GOOGLE:
                return this.googleStrategy;
            case auth_type_enum_1.OAuthProviderType.FACEBOOK:
                return this.facebookStrategy;
            case auth_type_enum_1.OAuthProviderType.APPLE:
                return this.appleStrategy;
            default:
                throw new common_1.BadRequestException(`Unsupported or missing OAuth provider: ${provider}`);
        }
    }
    async registerCredentials(dto, uid) {
        const strategy = this.getStrategy(dto.provider);
        return strategy.registerCredentials(dto, uid);
    }
    async login(dto) {
        const strategy = this.getStrategy(dto.provider);
        return strategy.login(dto);
    }
};
exports.OAuthAuthStrategy = OAuthAuthStrategy;
exports.OAuthAuthStrategy = OAuthAuthStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_2.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [google_strategy_1.GoogleAuthStrategy,
        facebook_strategy_1.FacebookAuthStrategy,
        apple_strategy_1.AppleAuthStrategy, Object])
], OAuthAuthStrategy);
//# sourceMappingURL=oauth.strategy.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategyProviders = void 0;
const auth_type_enum_1 = require("../enums/auth-type.enum");
const local_auth_strategy_1 = require("../strategies/local-auth.strategy");
const google_strategy_1 = require("../strategies/oauth/google.strategy");
const facebook_strategy_1 = require("../strategies/oauth/facebook.strategy");
const apple_strategy_1 = require("../strategies/oauth/apple.strategy");
const createStrategyProviders = (options) => {
    const providers = [];
    const enabled = options.enabledStrategies || [auth_type_enum_1.AuthStrategy.EMAIL];
    if (enabled.includes(auth_type_enum_1.AuthStrategy.EMAIL) || enabled.includes(auth_type_enum_1.AuthStrategy.PHONE) || enabled.includes(auth_type_enum_1.AuthStrategy.USERNAME)) {
        providers.push({
            provide: local_auth_strategy_1.LocalAuthStrategy,
            useClass: local_auth_strategy_1.LocalAuthStrategy,
        });
    }
    if (enabled.includes(auth_type_enum_1.AuthStrategy.GOOGLE)) {
        providers.push({
            provide: google_strategy_1.GoogleAuthStrategy,
            useClass: google_strategy_1.GoogleAuthStrategy,
        });
    }
    if (enabled.includes(auth_type_enum_1.AuthStrategy.FACEBOOK)) {
        providers.push({
            provide: facebook_strategy_1.FacebookAuthStrategy,
            useClass: facebook_strategy_1.FacebookAuthStrategy,
        });
    }
    if (enabled.includes(auth_type_enum_1.AuthStrategy.APPLE)) {
        providers.push({
            provide: apple_strategy_1.AppleAuthStrategy,
            useClass: apple_strategy_1.AppleAuthStrategy,
        });
    }
    return providers;
};
exports.createStrategyProviders = createStrategyProviders;
//# sourceMappingURL=registration.js.map
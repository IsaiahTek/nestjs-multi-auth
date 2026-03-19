import { Provider } from "@nestjs/common";
import { AuthStrategy } from "../enums/auth-type.enum";
import { LocalAuthStrategy } from "../strategies/local-auth.strategy";
import { GoogleAuthStrategy } from "../strategies/oauth/google.strategy";
import { FacebookAuthStrategy } from "../strategies/oauth/facebook.strategy";
import { AppleAuthStrategy } from "../strategies/oauth/apple.strategy";
import { AuthModuleOptions } from "../interfaces/auth-module-options.interface";
import { OAuthAuthStrategy } from "../strategies/oauth/oauth.strategy";

export const createStrategyProviders = (options: AuthModuleOptions): Provider[] => {
    const providers: Provider[] = [];
    const enabled = options.enabledStrategies || [AuthStrategy.EMAIL];

    if (enabled.includes(AuthStrategy.EMAIL) || enabled.includes(AuthStrategy.PHONE) || enabled.includes(AuthStrategy.USERNAME)) {
        providers.push({
            provide: LocalAuthStrategy,
            useClass: LocalAuthStrategy,
        });
    }

    if (enabled.includes(AuthStrategy.GOOGLE)) {
        providers.push({
            provide: GoogleAuthStrategy,
            useClass: GoogleAuthStrategy,
        });
    }

    if (enabled.includes(AuthStrategy.FACEBOOK)) {
        providers.push({
            provide: FacebookAuthStrategy,
            useClass: FacebookAuthStrategy,
        });
    }

    if (enabled.includes(AuthStrategy.APPLE)) {
        providers.push({
            provide: AppleAuthStrategy,
            useClass: AppleAuthStrategy,
        });
    }

    if (enabled.includes(AuthStrategy.APPLE) || enabled.includes(AuthStrategy.FACEBOOK) || enabled.includes(AuthStrategy.GOOGLE)) {
        providers.push({
            provide: OAuthAuthStrategy,
            useClass: OAuthAuthStrategy,
        });
    }

    return providers;
};
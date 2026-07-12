import { Injectable, BadRequestException } from '@nestjs/common';
import { SignupDto } from '../../dto/requests/signup.dto';
import { LoginDto } from '../../dto/requests/login.dto';
import { Auth } from '../../interfaces/models.interface';
import { AuthIdentifier } from '../../interfaces/models.interface';
import { OAuthProviderType } from '../../enums/auth-type.enum';
import { GoogleAuthStrategy } from './google.strategy';
import { FacebookAuthStrategy } from './facebook.strategy';
import { AppleAuthStrategy } from './apple.strategy';
import { IOAuthStrategy } from '../../interfaces/oauth-strategy.interface';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../../interfaces/auth-module-options.interface';
import { Inject } from '@nestjs/common';
import { AuthStrategy } from '../../enums/auth-type.enum';

@Injectable()
export class OAuthAuthStrategy implements IOAuthStrategy {
    constructor(
        private googleStrategy: GoogleAuthStrategy,
        private facebookStrategy: FacebookAuthStrategy,
        private appleStrategy: AppleAuthStrategy,
        @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    ) { }

    private getStrategy(provider?: OAuthProviderType): IOAuthStrategy {
        const enabledStrategies = this.options.enabledStrategies || Object.values(AuthStrategy);

        if (provider === OAuthProviderType.GOOGLE && !enabledStrategies.includes(AuthStrategy.GOOGLE) && !enabledStrategies.includes(AuthStrategy.OAUTH)) {
            throw new BadRequestException('Google authentication is currently disabled.');
        }
        if (provider === OAuthProviderType.FACEBOOK && !enabledStrategies.includes(AuthStrategy.FACEBOOK) && !enabledStrategies.includes(AuthStrategy.OAUTH)) {
            throw new BadRequestException('Facebook authentication is currently disabled.');
        }
        if (provider === OAuthProviderType.APPLE && !enabledStrategies.includes(AuthStrategy.APPLE) && !enabledStrategies.includes(AuthStrategy.OAUTH)) {
            throw new BadRequestException('Apple authentication is currently disabled.');
        }

        switch (provider) {
            case OAuthProviderType.GOOGLE:
                return this.googleStrategy;
            case OAuthProviderType.FACEBOOK:
                return this.facebookStrategy;
            case OAuthProviderType.APPLE:
                return this.appleStrategy;
            default:
                throw new BadRequestException(`Unsupported or missing OAuth provider: ${provider}`);
        }
    }

    async registerCredentials(dto: SignupDto, uid?: string): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        const strategy = this.getStrategy(dto.provider);
        return strategy.registerCredentials(dto, uid);
    }

    async login(dto: LoginDto): Promise<{ auth: Auth; identifier?: AuthIdentifier }> {
        const strategy = this.getStrategy(dto.provider);
        return strategy.login(dto);
    }
}

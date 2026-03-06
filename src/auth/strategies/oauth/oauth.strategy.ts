import { Injectable, BadRequestException } from '@nestjs/common';
import { SignupDto } from '../../dto/signup.dto';
import { LoginDto } from '../../dto/login.dto';
import { Auth } from '../../entities/auth.entity';
import { OAuthProviderType } from '../../auth-type.enum';
import { GoogleAuthStrategy } from './google.strategy';
import { FacebookAuthStrategy } from './facebook.strategy';
import { AppleAuthStrategy } from './apple.strategy';
import { IOAuthStrategy } from './oauth-strategy.interface';

@Injectable()
export class OAuthAuthStrategy implements IOAuthStrategy {
    constructor(
        private googleStrategy: GoogleAuthStrategy,
        private facebookStrategy: FacebookAuthStrategy,
        private appleStrategy: AppleAuthStrategy,
    ) { }

    private getStrategy(provider?: OAuthProviderType): IOAuthStrategy {
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

    async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
        const strategy = this.getStrategy(dto.provider);
        return strategy.registerCredentials(dto, uid);
    }

    async login(dto: LoginDto): Promise<Auth> {
        const strategy = this.getStrategy(dto.provider);
        return strategy.login(dto);
    }
}

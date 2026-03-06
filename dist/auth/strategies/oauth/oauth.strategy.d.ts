import { SignupDto } from '../../dto/signup.dto';
import { LoginDto } from '../../dto/login.dto';
import { Auth } from '../../entities/auth.entity';
import { GoogleAuthStrategy } from './google.strategy';
import { FacebookAuthStrategy } from './facebook.strategy';
import { AppleAuthStrategy } from './apple.strategy';
import { IOAuthStrategy } from './oauth-strategy.interface';
export declare class OAuthAuthStrategy implements IOAuthStrategy {
    private googleStrategy;
    private facebookStrategy;
    private appleStrategy;
    constructor(googleStrategy: GoogleAuthStrategy, facebookStrategy: FacebookAuthStrategy, appleStrategy: AppleAuthStrategy);
    private getStrategy;
    registerCredentials(dto: SignupDto, uid?: string): Promise<Auth>;
    login(dto: LoginDto): Promise<Auth>;
}

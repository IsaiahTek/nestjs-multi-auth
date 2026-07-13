import { Auth } from '../entities/auth.entity';
import { AuthIdentifier } from '../entities/auth-identify.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { MfaMethod } from '../entities/mfa-method.entity';
import { OtpToken } from '../entities/otp-token.entity';
import { Session } from '../entities/session.entity';
export declare const AuthEntities: (typeof AuthIdentifier | typeof Auth | typeof OAuthProvider | typeof OtpToken | typeof MfaMethod | typeof Session)[];

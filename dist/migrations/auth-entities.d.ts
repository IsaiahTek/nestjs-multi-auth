import { Auth } from '../auth/entities/auth.entity';
import { AuthIdentifier } from '../auth/entities/auth-identify.entity';
import { OAuthProvider } from '../auth/entities/oauth-provider.entity';
import { MfaMethod } from '../auth/entities/mfa-method.entity';
import { OtpToken } from '../auth/entities/otp-token.entity';
import { Session } from '../auth/entities/session.entity';
export declare const AuthEntities: (typeof Auth | typeof OAuthProvider | typeof AuthIdentifier | typeof OtpToken | typeof MfaMethod | typeof Session)[];

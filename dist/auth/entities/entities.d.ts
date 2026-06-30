import { Auth } from "./auth.entity";
import { AuthIdentifier } from "./auth-identify.entity";
import { OAuthProvider } from "./oauth-provider.entity";
import { OtpToken } from "./otp-token.entity";
import { MfaMethod } from "./mfa-method.entity";
import { Session } from "./session.entity";
export declare const AuthEntities: (typeof Auth | typeof OAuthProvider | typeof AuthIdentifier | typeof OtpToken | typeof MfaMethod | typeof Session)[];

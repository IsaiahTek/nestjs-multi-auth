import { Auth } from "./auth.entity";
import { AuthIdentifier } from "./auth-identify.entity";
import { OAuthProvider } from "./oauth-provider.entity";
import { OtpToken } from "./otp-token.entity";
import { EntitySchema, EntityTarget } from "typeorm";
import { MfaMethod } from "./mfa-method.entity";
import { Session } from "./session.entity";

export const AuthEntities: EntityTarget<any>[] = [
    Auth,
    AuthIdentifier,
    OAuthProvider,
    OtpToken,
    Session,
    MfaMethod
];

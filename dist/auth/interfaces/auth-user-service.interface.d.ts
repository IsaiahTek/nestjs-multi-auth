export declare const AUTH_USER_SERVICE = "AUTH_USER_SERVICE";
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export declare const AUTH_SIGNUP_HANDLER = "AUTH_SIGNUP_HANDLER";
export interface AuthUserLookupService {
    findUser(authId: string): Promise<any | null>;
    findById?(id: string): Promise<any | null>;
}
export interface AuthSignupHandler {
    onSignup(auth: any, dto: any): Promise<any>;
    create?(data: any): Promise<any>;
}
export interface AuthUserService extends AuthUserLookupService, AuthSignupHandler {
}

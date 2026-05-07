import { Strategy } from 'passport-jwt';
import { AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { JwtPayload } from '../interfaces/jwt-payload-interface';
import { AuthService } from '../auth.service';
import { AuthCookieService } from './cookie-namespace.resolver';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly options;
    private readonly authService;
    private readonly cookieService;
    private readonly logger;
    constructor(options: AuthModuleOptions, authService: AuthService, cookieService: AuthCookieService);
    validate(payload: JwtPayload): Promise<{
        uid: string;
        sessionId: string;
        user: import("../dto/responses/auth-response.dto").AuthResponseDto;
    }>;
}
export {};

import { Strategy } from 'passport-jwt';
import { AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { JwtPayload } from './jwt-payload-interface';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private options;
    private readonly logger;
    constructor(options: AuthModuleOptions);
    validate(payload: JwtPayload): Promise<any>;
}
export {};

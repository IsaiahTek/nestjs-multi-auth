import { Request } from "express";
import { AuthModuleOptions, CookieNameConfig } from "../interfaces/auth-module-options.interface";
export declare class AuthCookieService {
    private readonly options;
    constructor(options: AuthModuleOptions);
    private getNamespace;
    get(req: Request): CookieNameConfig;
}

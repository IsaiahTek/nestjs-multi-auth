import { Request } from "express";
import { AuthModuleOptions, AuthContext } from "../interfaces/auth-module-options.interface";
export declare class AuthContextService {
    private options;
    constructor(options: AuthModuleOptions);
    private _extractNamespaceFromReq;
    get(req: Request): AuthContext;
    getNamespace(req: Request): string;
}

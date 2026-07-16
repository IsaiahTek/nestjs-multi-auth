import { Inject, Injectable } from "@nestjs/common";
import { Request } from "express";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions, AuthContext } from "../interfaces/auth-module-options.interface";

@Injectable()
export class AuthContextService {
  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions
  ) { }

  private _extractNamespaceFromReq(req: Request): string {
    const hostname = req.hostname;
    const parts = hostname.split(".");

    if (parts.length <= 2) {
      return "root";
    }

    return parts.slice(0, parts.length - 2).join("_");
  }

  get(req: Request): AuthContext {
    // 1. USER OVERRIDE (highest priority)
    if (this.options.cookieNameResolver || this.options.authContextResolver) {
      const authContext = this.options.cookieNameResolver?.(req) ?? this.options.authContextResolver?.(req);
      return authContext;
    }
    const namespace =
      this._extractNamespaceFromReq(req);

    return {
      namespace,
      accessTokenName: `${namespace}_access_token`,
      refreshTokenName: `${namespace}_refresh_token`,
    };
  }

  getNamespace(req: Request): string {
    const ns = this.get(req).namespace;
    return ns;
  }
}
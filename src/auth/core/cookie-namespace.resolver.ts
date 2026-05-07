import { Inject, Injectable } from "@nestjs/common";
import { Request } from "express";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions, CookieNameConfig } from "../interfaces/auth-module-options.interface";

@Injectable()
export class AuthCookieService {
  constructor(
      @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions
    ) {}

  private getNamespace(req: Request): string {
    const hostname = req.hostname;
    const parts = hostname.split(".");

    if (parts.length <= 2) {
      return "root";
    }

    return parts.slice(0, parts.length - 2).join("_");
  }

  get(req: Request): CookieNameConfig {
    // 1. USER OVERRIDE (highest priority)
    if (this.options.cookieNameResolver) {
      return this.options.cookieNameResolver(req);
    }
    const namespace =
      this.getNamespace(req);

    return {
      accessTokenName: `${namespace}_access_token`,
      refreshTokenName: `${namespace}_refresh_token`,
    };
  }
}
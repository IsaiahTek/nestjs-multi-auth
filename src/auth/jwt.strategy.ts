// src/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { Inject } from '@nestjs/common';
import { JwtPayload } from './jwt-payload-interface';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
  ) {
    const cookieExtractor = (req: Request): string | null => {
      if (!req || !req.cookies) {
        return null;
      }

      const cookies = req.cookies as Record<string, string> | null;
      const token = cookies?.access_token ?? null;
      return typeof token === 'string' ? token : null;
    };
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: options.jwtSecret || process.env.JWT_SECRET || 'changeme',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    this.logger.log(`JWT payload: ${JSON.stringify(payload)}`);

    // In Identity-Only mode, req.user is the token payload.
    // The application uses the 'sub' (uid) to link to its own user record.
    return {
      uid: payload.sub,
      sessionId: payload.sessionId,
    };
  }
}

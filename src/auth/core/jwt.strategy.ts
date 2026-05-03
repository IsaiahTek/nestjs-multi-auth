// src/auth/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from '../interfaces/auth-module-options.interface';
import { Inject } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload-interface';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
    private readonly authService: AuthService,
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

  async validate(payload: JwtPayload) {
    const user = await this.authService.me(payload.sub);

    if (!user) {
      this.logger.error("User no longer exists");
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      uid: user?.uid,
      sessionId: payload.sessionId,
      user,
    };
  }
}

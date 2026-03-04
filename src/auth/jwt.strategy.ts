// src/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './interfaces/auth-module-options.interface';
import { Inject } from '@nestjs/common';
import { JwtPayload } from './jwt-payload-interface';
import { CurrentUser } from './current-user-interface';
import { Request } from 'express';
// import { InjectRepository } from '@nestjs/typeorm';
// import { User } from 'src/users/entities/user.entity';
// import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(@Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions) {
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
    this.logger.log(
      `JWT secret initialized.`,
    );
  }

  validate(payload: JwtPayload): CurrentUser {
    this.logger.log(`JWT payload: ${JSON.stringify(payload)}`);
    // const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    // if (!user) {
    //   throw new Error('User not found');
    // }
    return {
      sub: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      id: payload.sub,
    };
  }
}

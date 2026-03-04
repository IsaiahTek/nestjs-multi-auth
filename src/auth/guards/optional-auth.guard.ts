/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/optional-auth.guard.ts
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    this.logger.debug(`Authorization header: ${authHeader || 'none'}`);

    if (!authHeader) {
      this.logger.debug('No authorization header, skipping JWT check');
      req.user = null; // 👈 set anonymous user
      return true;
    }

    // fallback to normal AuthGuard behavior
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.warn(`JWT error: ${err.message}`);
    }
    if (info) {
      this.logger.debug(`JWT info: ${JSON.stringify(info)}`);
    }

    return user || null;
  }
}

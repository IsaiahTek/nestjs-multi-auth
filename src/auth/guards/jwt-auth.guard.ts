/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/auth/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';
import { IS_OPTIONAL_KEY } from '../decorator/optional.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isOptional || isPublic) {
      // Try JWT, but don’t throw if missing/invalid
      try {
        return (await super.canActivate(context)) as boolean;
      } catch {
        const request = context.switchToHttp().getRequest();
        request.user = null;
        return true;
      }
    }

    // Default = strict JWT required
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if this is an optional or public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // console.log('Auth user', user);

    // For optional/public routes, allow null user
    if (isOptional || isPublic) {
      return user || null;
    }

    // For protected routes, throw error if no valid user
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}

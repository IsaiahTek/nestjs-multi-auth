import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { AuthCredential } from '../interfaces/current-user-interface';

// src/auth/current-user.decorator.ts
export const CurrentAuth = createParamDecorator(
  (data: keyof AuthCredential | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

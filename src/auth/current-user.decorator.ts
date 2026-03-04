import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { CurrentUser as UserRquest } from './current-user-interface';

// src/auth/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof UserRquest | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();

    const logger = new Logger('CurrentUserDecorator');
    // logger.log(`Request keys: ${Object.keys(request)}`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as UserRquest;

    logger.log(`Extracted user: ${JSON.stringify(user)}`);

    return data ? user?.[data] : user;
  },
);

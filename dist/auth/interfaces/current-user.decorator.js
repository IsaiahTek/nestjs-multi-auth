"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentAuth = void 0;
const common_1 = require("@nestjs/common");
// src/auth/current-user.decorator.ts
exports.CurrentAuth = (0, common_1.createParamDecorator)((data, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    const logger = new common_1.Logger('CurrentAuthDecorator');
    // logger.log(`Request keys: ${Object.keys(request)}`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user;
    logger.log(`Extracted auth: ${JSON.stringify(user)}`);
    return data ? user?.[data] : user;
});
//# sourceMappingURL=current-user.decorator.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const logger = new common_1.Logger('CurrentUserDecorator');
    const user = request.user;
    logger.log(`Extracted user: ${JSON.stringify(user)}`);
    return data ? user?.[data] : user;
});
//# sourceMappingURL=current-user.decorator.js.map
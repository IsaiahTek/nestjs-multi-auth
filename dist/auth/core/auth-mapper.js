"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMapper = void 0;
const class_transformer_1 = require("class-transformer");
const auth_response_dto_1 = require("../dto/responses/auth-response.dto");
class AuthMapper {
    static toDto(auth) {
        return (0, class_transformer_1.plainToInstance)(auth_response_dto_1.AuthResponseDto, auth, {
            excludeExtraneousValues: true,
        });
    }
    static toDtoList(auths) {
        return auths.map(this.toDto);
    }
}
exports.AuthMapper = AuthMapper;
//# sourceMappingURL=auth-mapper.js.map
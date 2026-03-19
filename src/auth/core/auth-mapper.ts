import { plainToInstance } from "class-transformer";
import { AuthResponseDto } from "../dto/responses/auth-response.dto";
import { Auth } from "../entities/auth.entity";


export class AuthMapper {
    static toDto(auth: Auth) {
        return plainToInstance(AuthResponseDto, auth, {
            excludeExtraneousValues: true,
        });
    }

    static toDtoList(auths: Auth[]) {
        return auths.map(this.toDto);
    }
}
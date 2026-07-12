import { AuthResponseDto } from "../dto/responses/auth-response.dto";
import { Auth } from '../interfaces/models.interface';
export declare class AuthMapper {
    static toDto(auth: Auth): AuthResponseDto;
    static toDtoList(auths: Auth[]): AuthResponseDto[];
}

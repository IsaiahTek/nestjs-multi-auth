import { AuthDTO } from "./signup-event-body.interface";
export interface Tokens {
    accessToken: string;
    refreshToken: string;
}
export interface SigninEventBody {
    auth: AuthDTO;
    tokens: Tokens;
}

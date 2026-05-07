import { AuthStrategy } from "../enums/auth-type.enum";
export interface Tokens {
    accessToken: string;
    refreshToken: string;
}
export interface SigninEventBody {
    auth: AuthDTO;
    tokens: Tokens;
}
export interface AuthDTO {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    uid: string;
    strategy: AuthStrategy;
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta: Record<string, any> | null;
    lastUsedAt: string;
}

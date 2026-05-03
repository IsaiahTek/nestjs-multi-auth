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
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    deletedAt: string | null;
    uid: string;
    strategy: AuthStrategy; // extend if needed
    isPrimary: boolean;
    isVerified: boolean;
    isActive: boolean;
    meta: Record<string, any> | null;
    lastUsedAt: string; // ISO date
}
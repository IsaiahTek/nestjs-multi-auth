export interface JwtPayload {
    sub: string;
    email?: string;
    phone?: string;
    role: string;
}

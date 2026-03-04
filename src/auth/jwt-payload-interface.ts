// src/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // user id
  email?: string;
  phone?: string;
  role: string;
}

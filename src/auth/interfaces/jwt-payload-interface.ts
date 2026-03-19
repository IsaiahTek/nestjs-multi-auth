// src/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // The identity UID
  sessionId: string;
}

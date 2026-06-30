// src/auth/jwt-payload.interface.ts
export interface JwtPayload {
  /**
   * Optional namespace derived from `authContextResolver` or defaults to `root`
   */
  namespace?: string;     // Optional namespace derived from `authContextResolver` or defaults to `root`
  sub: string;            // The identity UID
  sessionId: string;
}

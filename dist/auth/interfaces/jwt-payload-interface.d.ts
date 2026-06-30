export interface JwtPayload {
    /**
     * Optional namespace derived from `authContextResolver` or defaults to `root`
     */
    namespace?: string;
    sub: string;
    sessionId: string;
}

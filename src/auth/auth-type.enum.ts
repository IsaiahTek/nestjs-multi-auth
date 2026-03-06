// src/auth/enums/auth-types.enum.ts

export enum AuthStrategy {
  // Local / Password-based
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  USERNAME = 'USERNAME',

  // Social / OAuth
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',

  /** @deprecated Use granular types instead */
  LOCAL = 'LOCAL',
  /** @deprecated Use granular types instead */
  OAUTH = 'OAUTH',
}

export enum OAuthProviderType {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

export enum AuthTransport {
  COOKIE = 'cookie',
  BEARER = 'bearer',
  BOTH = 'both',
}

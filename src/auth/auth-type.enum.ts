// src/auth/enums/auth-types.enum.ts

export enum AuthStrategy {
  LOCAL = 'LOCAL', // Password based
  OAUTH = 'OAUTH', // Social Login
  // MAGIC_LINK = 'MAGIC_LINK', // Future use
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

import { AuthStrategy } from './auth-type.enum';

export enum IdentifierType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  USERNAME = 'USERNAME',
}

export enum IdentifierSource {
  APPLE = AuthStrategy.APPLE,
  FACEBOOK = AuthStrategy.FACEBOOK,
  GOOGLE = AuthStrategy.GOOGLE,
  LOCAL = AuthStrategy.LOCAL,
}

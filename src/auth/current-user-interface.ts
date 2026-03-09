// import { User } from 'src/users/entities/user.entity';

// src/auth/current-user.interface.ts
export interface AuthCredentials {
  sub: string;
  email?: string;
  phone?: string;
  role?: string;
  id: string;
}

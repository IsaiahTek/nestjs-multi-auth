import { AuthStrategy } from "../enums/auth-type.enum";
import { AuthIdentifier } from '../interfaces/models.interface';


export interface Identifier {
  type: AuthIdentifier;
  value: string;
  verifiedBy: string | null;
  id: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  deletedAt: string | null;
  isVerified: boolean;
  source: AuthStrategy;
}

export interface AuthDTO {
  id: string;
  uid: string;
  strategy: AuthStrategy;
  isPrimary: boolean;
  isActive: boolean;
  isVerified: boolean;
  identifiers: Identifier[];
  meta: Record<string, any> | null;
  lastUsedAt: string | null;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  deletedAt: string | null;
}

export interface SignupEventBody {
  auth: AuthDTO;
  identifier: Identifier;
  /**
   * Extra data passed during signup
   */
  extraData?: Record<string, unknown>;
}
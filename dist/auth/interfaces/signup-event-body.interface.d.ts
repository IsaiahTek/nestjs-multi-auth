export type IdentifierType = "EMAIL" | string;
export type IdentifierSource = "LOCAL" | string;
export interface Identifier {
    type: IdentifierType;
    value: string;
    verifiedBy: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    isVerified: boolean;
    source: IdentifierSource;
}
export interface AuthDTO {
    id: string;
    uid: string;
    strategy: "EMAIL" | string;
    isPrimary: boolean;
    isActive: boolean;
    isVerified: boolean;
    identifiers: Identifier[];
    meta: Record<string, any> | null;
    lastUsedAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}
export interface AuthWithIdentifierResponse {
    auth: AuthDTO;
    identifier: Identifier;
}

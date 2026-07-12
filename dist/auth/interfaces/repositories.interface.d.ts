import { Auth, AuthIdentifier, OAuthProvider, OtpToken, MfaMethod, Session, SessionLog } from './models.interface';
import { AuthStrategy } from '../enums/auth-type.enum';
export interface AuthRepository {
    create(data: Partial<Auth>): Promise<Auth>;
    findById(id: string): Promise<Auth | null>;
    findByUid(uid: string): Promise<Auth | null>;
    findAllByUid(uid: string): Promise<Auth[]>;
    findAll(): Promise<Auth[]>;
    findByUidAndStrategy(uid: string, strategy: AuthStrategy): Promise<Auth | null>;
    findByUidAndStrategies(uid: string, strategies: AuthStrategy[]): Promise<Auth | null>;
    save(auth: Auth): Promise<Auth>;
    update(id: string, data: Partial<Auth>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    findWithIdentifiers(id: string): Promise<Auth | null>;
}
export interface AuthIdentifierRepository {
    create(data: Partial<AuthIdentifier>): Promise<AuthIdentifier>;
    findByValue(value: string): Promise<AuthIdentifier | null>;
    findByAuthId(authId: string): Promise<AuthIdentifier[]>;
    findByUidAndTypes(uid: string, types: string[]): Promise<AuthIdentifier | null>;
    findWithAuthByValue(value: string): Promise<{
        identifier: AuthIdentifier;
        auth: Auth;
    } | null>;
    save(identifier: AuthIdentifier): Promise<AuthIdentifier>;
    markVerifiedByAuthId(authId: string): Promise<void>;
}
export interface OAuthProviderRepository {
    create(data: Partial<OAuthProvider>): Promise<OAuthProvider>;
    findByProviderUserId(provider: string, providerUserId: string): Promise<OAuthProvider | null>;
    findWithAuthByProviderUserId(provider: string, providerUserId: string): Promise<{
        provider: OAuthProvider;
        auth: Auth;
    } | null>;
    save(provider: OAuthProvider): Promise<OAuthProvider>;
    update(id: string, data: Partial<OAuthProvider>): Promise<void>;
}
export interface OtpTokenRepository {
    create(data: Partial<OtpToken>): Promise<OtpToken>;
    findLatestUnused(uid: string): Promise<OtpToken | null>;
    findLatestUnusedByPurpose(uid: string, purpose: string): Promise<OtpToken | null>;
    save(token: OtpToken): Promise<OtpToken>;
    deleteByUid(uid: string): Promise<void>;
}
export interface MfaMethodRepository {
    create(data: Partial<MfaMethod>): Promise<MfaMethod>;
    findByUidAndType(uid: string, type: string): Promise<MfaMethod | null>;
    findByUidAndEnabled(uid: string): Promise<MfaMethod | null>;
    save(method: MfaMethod): Promise<MfaMethod>;
    deleteByUid(uid: string): Promise<void>;
}
export interface SessionRepository {
    create(data: Partial<Session>): Promise<Session>;
    findById(id: string): Promise<Session | null>;
    findDeviceSession(uid: string, namespace: string | undefined, deviceFingerprint: string): Promise<Session | null>;
    findByUid(uid: string): Promise<Session[]>;
    findByIdWithDetails(id: string, namespace?: string): Promise<Session | null>;
    save(session: Session): Promise<Session>;
    update(id: string, data: Partial<Session>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUid(uid: string): Promise<void>;
    transaction(runInTransaction: (repo: SessionRepository) => Promise<void>): Promise<void>;
}
export interface SessionLogRepository {
    create(data: Partial<SessionLog>): Promise<SessionLog>;
    save(log: SessionLog): Promise<SessionLog>;
    saveMany(logs: SessionLog[]): Promise<SessionLog[]>;
    findByUidAndNamespace(uid: string, namespace?: string): Promise<SessionLog[]>;
}

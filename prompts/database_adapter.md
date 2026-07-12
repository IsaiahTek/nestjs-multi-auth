# Decouple the Authentication Core from TypeORM — nestjs-multi-auth

## Context

You are working on **nestjs-multi-auth**, a production-grade authentication library for NestJS.

## Objective

Refactor the authentication library so that **all persistence is abstracted behind repository interfaces**, removing any hard dependency on TypeORM from the authentication core.

## Problem

The authentication core currently depends directly on TypeORM. It imports and uses:

- `Repository`
- `Entity`
- `QueryBuilder`
- TypeORM decorators
- Raw SQL

This couples core authentication logic to a single ORM, making it difficult or impossible for developers to use **Prisma**, **Drizzle ORM**, **MikroORM**, **Sequelize**, **MongoDB**, or a custom data store without forking the library.

## Design Principles

### The authentication core IS responsible for

- Authentication and authorization business logic
- Identity verification workflows
- Session lifecycle rules
- OTP orchestration
- MFA orchestration
- OAuth provider linking logic
- All validation and decision-making

### The authentication core is NOT responsible for

- How data is queried or persisted
- Which database or ORM is used
- Schema definitions
- Query construction, connection management, or transactions specific to any ORM

Persistence mechanics are the responsibility of a **repository adapter**, never the core.

---

## New Architecture

### 1. Repository Interfaces (NEW)

Define abstract repository interfaces for every persisted concern in the library, including at minimum:

- `AuthMethodRepository`
- `IdentifierRepository`
- `SessionRepository`
- `OtpRepository`
- `MfaRepository`
- `OAuthProviderRepository`

Each interface should:

- Expose only the operations the authentication core actually needs (e.g. `findByIdentifier`, `create`, `update`, `delete`, `markUsed`) — not generic ORM-style methods.
- Use plain domain types (not ORM entities) for inputs and outputs.
- Contain no TypeORM types, decorators, or query-builder references anywhere in their signatures.

**Example shape:**

```typescript
export interface SessionRepository {
  create(session: CreateSessionInput): Promise<AuthSession>;
  findById(id: string): Promise<AuthSession | null>;
  revoke(id: string): Promise<void>;
  findActiveByAuthId(authId: string): Promise<AuthSession[]>;
}
```

### 2. Domain Models (NEW)

Introduce plain TypeScript interfaces/types (e.g. `AuthSession`, `AuthMethod`, `AuthIdentifier`, `OtpRecord`, `MfaFactor`, `OAuthLink`) that represent persisted data within the core. These types must be:

- Free of TypeORM decorators (`@Entity`, `@Column`, `@ManyToOne`, etc.)
- The only shapes the authentication core ever operates on
- Mapped to and from ORM entities exclusively inside adapters

### 3. First-Party TypeORM Adapter

Provide a `TypeOrmAuthAdapter` package/module that:

- Implements every repository interface using TypeORM `Repository`, `Entity`, and `QueryBuilder` as needed.
- Preserves 100% of current behavior — this is the default, drop-in implementation.
- Contains all TypeORM-specific code, entity definitions, and migrations.
- Is the **only** place in the library where TypeORM is imported.

### 4. Adapter Extensibility

The architecture must make it straightforward to build equivalent adapters for:

- Prisma
- Drizzle ORM
- MikroORM
- Sequelize
- MongoDB (or other non-relational stores)
- Fully custom data stores

An adapter author should only need to implement the repository interfaces and provide domain-model mapping — no changes to the authentication core should ever be required.

---

## Dependency Injection

- Introduce injection tokens for each repository interface (e.g. `SESSION_REPOSITORY`, `OTP_REPOSITORY`, `AUTH_METHOD_REPOSITORY`, etc.), following the same pattern as existing tokens like `AUTH_NOTIFICATION_PROVIDER`.
- If no adapter is registered, automatically register the `TypeOrmAuthAdapter` implementations so existing applications continue to work without any change.
- Allow applications to override individual repositories independently (e.g. use the TypeORM adapter for sessions but a custom repository for OTPs), rather than forcing an all-or-nothing swap.

---

## `AuthService` and Core Changes

- Remove all direct TypeORM imports, `@InjectRepository()` usages, and query-builder calls from the authentication core.
- Replace all persistence calls with calls to the appropriate repository interface.
- Ensure business logic (validation, expiration checks, state transitions, error handling) stays in the core services — adapters should contain **no business logic**, only data access and mapping.

**Before:**

```typescript
const session = await this.sessionRepo
  .createQueryBuilder('session')
  .where('session.authId = :authId', { authId })
  .getOne();
```

**After:**

```typescript
const session = await this.sessionRepository.findActiveByAuthId(authId);
```

---

## Backward Compatibility

This refactor must **not** break existing applications.

- Applications using the library today (implicitly relying on TypeORM) should continue to work with **zero configuration changes**, since `TypeOrmAuthAdapter` is registered by default.
- Only developers who wish to switch persistence layers need to provide alternate repository implementations.
- Public authentication API surface (methods, DTOs, module configuration options unrelated to persistence) must remain unchanged.

---

## Code Quality Requirements

- Follow SOLID principles, in particular the Dependency Inversion Principle — the core depends on abstractions, not on TypeORM.
- Keep all TypeORM-specific code isolated inside the `TypeOrmAuthAdapter`; no leakage into shared/core packages.
- Avoid leaking ORM-specific types (entities, query builders, decorators) across the core/adapter boundary in either direction.
- Ensure each repository interface is small and focused (Interface Segregation) rather than one large generic repository.
- Ensure the authentication core is fully unit testable using in-memory or mock repository implementations, with no database required.
- Preserve all current tests and behavior where possible; add adapter-level tests against the interfaces.
- Document the repository interfaces clearly enough that a third party could implement a new adapter without reading the core source.
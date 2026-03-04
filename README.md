# NestJS Multi-Auth

A flexible, decoupled, and production-ready authentication library for NestJS applications. `nestjs-multi-auth` supports JWT/Refresh token rotation, dynamic configuration, and multiple authentication transports (Cookies and Bearer tokens), while remaining completely agnostic of your application's specific `User` entity or ORM structure.

## Features

- **Decoupled User Architecture**: Bring your own `User` entity and database logic. Implement our simple `AuthUserService` interface and the library handles the rest.
- **Dynamic Configuration**: Configure JWT secrets, expiration times, and transport preferences dynamically via `AuthModule.register()`.
- **Multiple Auth Transports**: Choose between returning tokens via HTTP-only Cookies, JSON body (Bearer token), or both.
- **Automatic Token Rotation**: Build-in `/refresh` and `/logout` endpoints that automatically respect your chosen transport method.
- **Session & Device Tracking**: Tracks IP and User Agent for basic session fingerprinting.

---

## Installation

Install the library using npm:

```bash
npm install nestjs-multi-auth
```

Ensure you have the required peer dependencies installed in your NestJS project:

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt class-validator bcrypt typeorm
```

---

## Quick Start

### 1. Implement the `AuthUserService`

The library needs to know how to create and lookup users in your database. Create a service in your app that implements the `AuthUserService` interface exported by the library:

```typescript
// src/users/my-user.service.ts
import { Injectable } from '@nestjs/common';
import { AuthUserService } from 'nestjs-multi-auth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class MyUserService implements AuthUserService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async findById(id: string): Promise<any | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: any): Promise<any> {
    // Expected data contains { email, password, role } from the AuthController
    const newUser = this.userRepo.create(data);
    return this.userRepo.save(newUser);
  }
}
```

### 2. Register the `AuthModule`

Import and configure the `AuthModule` in your root `AppModule` or feature module. Provide your implementation of the user service and your token secrets:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule, AuthTransport } from 'nestjs-multi-auth';
import { MyUserService } from './users/my-user.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule, // Ensure your provider's module is imported
    AuthModule.register({
      jwtSecret: process.env.JWT_SECRET || 'super-secret',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret',
      userService: MyUserService,
      
      // Optional: defaults to [AuthTransport.BEARER]
      // You can supply COOKIE, BEARER, or BOTH
      transport: [AuthTransport.COOKIE, AuthTransport.BEARER],
    }),
  ],
})
export class AppModule {}
```

---

## Auth Transports (Cookie vs Bearer)

The library provides extreme flexibility for how your front-end interacts with tokens. You must specify your `transport` array in the `AuthModule.register()` configuration.

- `AuthTransport.COOKIE`: Tokens are automatically set as secure, HTTP-only `Set-Cookie` headers upon Login/Signup. The `/refresh` endpoint automatically reads the cookie (`refresh_token`) and issues new cookies. The `/logout` endpoint automatically clears these cookies. **Zero manual token management is required on your frontend client.**
- `AuthTransport.BEARER`: Tokens are returned in the JSON response body (`tokens: { accessToken, refreshToken }`). The `/refresh` and `/logout` endpoints seamlessly accept a JSON payload containing `{"refreshToken": "..."}`, or gracefully fallback to checking the `Authorization: Bearer <token>` header.
- `AuthTransport.BOTH`: Tokens are set as cookies *and* returned in the JSON response simultaneously.

---

## Provided Endpoints

The library automatically mounts the following endpoints under the `/auth` prefix:

- `POST /auth/signup`: Accepts email, password, phone, and role. Creates a user via your `AuthUserService` and returns tokens based on transport.
- `POST /auth/signin`: Accepts email and password. Returns tokens based on transport.
- `POST /auth/refresh`: Refreshes your short-lived access token using a valid refresh token.
- `POST /auth/logout`: Invalidates the session in the database and clears cookies (if applicable).

*(All endpoints are automatically documented if you have `@nestjs/swagger` configured in your root app).*

---

## Entity Requirements

Because this library is decoupled, it exposes its own minimal tracking entities (`Auth`, `Session`, `MfaMethod`). Under the hood, they use a generic `userId: string` column instead of a hard TypeORM `@ManyToOne` relation to your application space.

To use the Auth functionality, ensure `TypeOrmModule.forRoot()` is initialized in your consuming app so the library can inject its managed repositories automatically!

---

## License

ISC

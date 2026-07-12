"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrationV1 = void 0;
class AuthMigrationV1 {
    down(queryRunner) {
        throw new Error('Method not implemented.');
    }
    get version() { return AuthMigrationV1.version; }
    async up(queryRunner) {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        // Create Enum Types
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_strategy_enum') THEN
          CREATE TYPE "auth_strategy_enum" AS ENUM('EMAIL', 'PHONE', 'USERNAME', 'GOOGLE', 'FACEBOOK', 'APPLE', 'LOCAL', 'OAUTH');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_identifier_type_enum') THEN
          CREATE TYPE "auth_identifier_type_enum" AS ENUM('EMAIL', 'PHONE', 'USERNAME');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider_type_enum') THEN
          CREATE TYPE "oauth_provider_type_enum" AS ENUM('GOOGLE', 'FACEBOOK', 'APPLE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mfa_method_type_enum') THEN
          CREATE TYPE "mfa_method_type_enum" AS ENUM('TOTP', 'SMS', 'EMAIL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_token_purpose_enum') THEN
          CREATE TYPE "otp_token_purpose_enum" AS ENUM('VERIFY_EMAIL', 'VERIFY_PHONE', 'PASSWORD_RESET', 'LOGIN_2FA');
        END IF;
      END $$;
    `);
        // 1. auth table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "uid" character varying,
        "strategy" "auth_strategy_enum" NOT NULL,
        "secretHash" character varying,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "isVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "meta" jsonb,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_auth" PRIMARY KEY ("id")
      )
    `);
        // 2. auth_identifiers table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_identifiers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "type" "auth_identifier_type_enum" NOT NULL,
        "value" character varying NOT NULL,
        "source" "auth_strategy_enum" NOT NULL DEFAULT 'LOCAL',
        "isVerified" boolean NOT NULL DEFAULT false,
        "verifiedBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_auth_identifiers" PRIMARY KEY ("id")
      )
    `);
        // 3. oauth_providers table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oauth_providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "provider" "oauth_provider_type_enum" NOT NULL,
        "providerUserId" character varying NOT NULL,
        "accessToken" character varying,
        "refreshToken" character varying,
        "expiresAt" TIMESTAMP,
        "displayName" character varying,
        "avatarUrl" character varying,
        "emailVerified" boolean,
        "rawProfile" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_oauth_providers" PRIMARY KEY ("id")
      )
    `);
        // 4. auth_mfa_methods table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_mfa_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "uid" character varying NOT NULL,
        "type" "mfa_method_type_enum" NOT NULL,
        "secret" character varying NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "isDefault" boolean NOT NULL DEFAULT false,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_mfa_methods" PRIMARY KEY ("id")
      )
    `);
        // 5. otp_tokens table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "identifier" character varying NOT NULL,
        "purpose" "otp_token_purpose_enum" NOT NULL,
        "codeHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "isUsed" boolean NOT NULL DEFAULT false,
        "requestUserId" character varying,
        "requestAuthId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_otp_tokens" PRIMARY KEY ("id")
      )
    `);
        // 6. sessions table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "uid" character varying NOT NULL,
        "refreshTokenHash" character varying NOT NULL,
        "userAgent" character varying,
        "deviceFingerprint" character varying,
        "ipAddress" character varying,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id")
      )
    `);
        // Indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_uid" ON "auth" ("uid")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_strategy" ON "auth" ("strategy")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_isActive" ON "auth" ("isActive")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_identifiers_authId" ON "auth_identifiers" ("authId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_identifiers_value" ON "auth_identifiers" ("value")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_oauth_providers_authId" ON "oauth_providers" ("authId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_mfa_methods_uid" ON "auth_mfa_methods" ("uid")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_tokens_identifier" ON "otp_tokens" ("identifier")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sessions_uid" ON "sessions" ("uid")`);
        // Foreign Keys
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_auth_identifiers_authId') THEN
          ALTER TABLE "auth_identifiers" ADD CONSTRAINT "FK_auth_identifiers_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_oauth_providers_authId') THEN
          ALTER TABLE "oauth_providers" ADD CONSTRAINT "FK_oauth_providers_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    }
}
exports.AuthMigrationV1 = AuthMigrationV1;
AuthMigrationV1.version = 1;
//# sourceMappingURL=auth.migration.v1.js.map
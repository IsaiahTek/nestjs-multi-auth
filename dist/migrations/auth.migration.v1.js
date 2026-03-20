"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrationV1 = void 0;
class AuthMigrationV1 {
    constructor() {
        this.version = 1;
    }
    down(queryRunner) {
        throw new Error('Method not implemented.');
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "uid" uuid,
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
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_identifier" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "type" "auth_identifier_type_enum" NOT NULL,
        "value" character varying NOT NULL,
        "normalizedValue" character varying NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "isVerified" boolean NOT NULL DEFAULT false,
        "meta" jsonb,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_auth_identifier" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oauth_provider" (
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
        CONSTRAINT "PK_oauth_provider" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mfa_method" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "type" "mfa_method_type_enum" NOT NULL,
        "secret" character varying NOT NULL,
        "backupCodes" text NOT NULL,
        "isVerified" boolean NOT NULL DEFAULT false,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_mfa_method" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_token" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "type" "otp_token_type_enum" NOT NULL,
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_otp_token" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "authId" uuid,
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "meta" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_session" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_primary_auth" ON "auth" ("uid")
      WHERE "isPrimary" = true
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_strategy" ON "auth" ("strategy")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_isActive" ON "auth" ("isActive")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_authId" ON "auth_identifier" ("authId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_type" ON "auth_identifier" ("type")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_value" ON "auth_identifier" ("value")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_normalizedValue" ON "auth_identifier" ("normalizedValue")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_isPrimary" ON "auth_identifier" ("isPrimary")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_identifier_isVerified" ON "auth_identifier" ("isVerified")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oauth_provider_authId" ON "oauth_provider" ("authId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oauth_provider_provider" ON "oauth_provider" ("provider")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oauth_provider_providerUserId" ON "oauth_provider" ("providerUserId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mfa_method_authId" ON "mfa_method" ("authId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mfa_method_type" ON "mfa_method" ("type")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mfa_method_isVerified" ON "mfa_method" ("isVerified")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_token_authId" ON "otp_token" ("authId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_token_type" ON "otp_token" ("type")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_token_token" ON "otp_token" ("token")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_token_expiresAt" ON "otp_token" ("expiresAt")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_authId" ON "session" ("authId")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_token" ON "session" ("token")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expiresAt" ON "session" ("expiresAt")
    `);
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_auth_uid') THEN
          ALTER TABLE "auth" ADD CONSTRAINT "FK_auth_uid" FOREIGN KEY ("uid") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_auth_identifier_authId') THEN
          ALTER TABLE "auth_identifier" ADD CONSTRAINT "FK_auth_identifier_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_oauth_provider_authId') THEN
          ALTER TABLE "oauth_provider" ADD CONSTRAINT "FK_oauth_provider_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_mfa_method_authId') THEN
          ALTER TABLE "mfa_method" ADD CONSTRAINT "FK_mfa_method_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_otp_token_authId') THEN
          ALTER TABLE "otp_token" ADD CONSTRAINT "FK_otp_token_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_session_authId') THEN
          ALTER TABLE "session" ADD CONSTRAINT "FK_session_authId" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    }
}
exports.AuthMigrationV1 = AuthMigrationV1;
//# sourceMappingURL=auth.migration.v1.js.map
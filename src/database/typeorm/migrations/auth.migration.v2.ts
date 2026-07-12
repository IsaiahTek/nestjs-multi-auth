import { QueryRunner } from 'typeorm';
import { AuthMigration } from './auth.migration.v1';

export class AuthMigrationV2 implements AuthMigration {
  static version = 2;
  get version() { return AuthMigrationV2.version; }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth_mfa_methods" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth_mfa_methods"
      DROP COLUMN IF EXISTS "updatedAt",
      DROP COLUMN IF EXISTS "deletedAt";
    `);
  }
}

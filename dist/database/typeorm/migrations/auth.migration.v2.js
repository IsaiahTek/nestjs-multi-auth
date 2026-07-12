"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrationV2 = void 0;
class AuthMigrationV2 {
    get version() { return AuthMigrationV2.version; }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "auth_mfa_methods" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "auth_mfa_methods"
      DROP COLUMN IF EXISTS "updatedAt",
      DROP COLUMN IF EXISTS "deletedAt";
    `);
    }
}
exports.AuthMigrationV2 = AuthMigrationV2;
AuthMigrationV2.version = 2;
//# sourceMappingURL=auth.migration.v2.js.map
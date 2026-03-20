"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrationV2 = void 0;
class AuthMigrationV2 {
    constructor() {
        this.version = 2;
    }
    async up(queryRunner) {
        const tables = ['oauth_provider', 'auth_identifier', 'mfa_method', 'otp_token', 'session'];
        for (const table of tables) {
            // Check if authId column exists
            const hasColumn = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = 'authId'
      `);
            if (hasColumn.length === 0) {
                // Add column
                await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "authId" uuid`);
                // Add Foreign Key constraint (ignoring if it already might exist for some reason)
                try {
                    await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD CONSTRAINT "FK_${table}_authId" 
            FOREIGN KEY ("authId") REFERENCES "auth"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
          `);
                }
                catch (e) {
                    // Constraint might already exist
                }
            }
        }
    }
    async down(queryRunner) {
        // Optionally remove columns, but typically we don't want to lose data in a down migration if it's not strictly necessary.
    }
}
exports.AuthMigrationV2 = AuthMigrationV2;
//# sourceMappingURL=auth.migration.v2.js.map
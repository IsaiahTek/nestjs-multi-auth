import { Injectable, Optional } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";
import { AuthMigrations } from "./auth.migrations";

@Injectable()
export class AuthMigrationService {
    constructor(@Optional() private dataSource: DataSource) { }

    async runMigrations() {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();

        await this.ensureMetaTable(queryRunner);

        const currentVersion = await this.getCurrentVersion(queryRunner);

        const pendingMigrations = AuthMigrations.filter(
            (M: any) => M.version > currentVersion
        );

        for (const MigrationClass of pendingMigrations) {
            const migration = new MigrationClass();

            await queryRunner.startTransaction();

            try {
                await migration.up(queryRunner);

                await this.updateVersion(queryRunner, migration.version);

                await queryRunner.commitTransaction();
            } catch (err) {
                await queryRunner.rollbackTransaction();
                throw err;
            }
        }

        await queryRunner.release();
    }

    async ensureMetaTable(qr?: QueryRunner) {
        const executor = qr || this.dataSource;
        await executor.query(`
            CREATE TABLE IF NOT EXISTS auth_schema_meta (
            id SERIAL PRIMARY KEY,
            version INT NOT NULL,
            updated_at TIMESTAMP DEFAULT now()
            )
        `);
    }

    async getCurrentVersion(qr?: QueryRunner): Promise<number> {
        await this.ensureMetaTable(qr);
        const executor = qr || this.dataSource;
        const result = await executor.query(`
            SELECT version FROM auth_schema_meta ORDER BY version DESC LIMIT 1
        `);
        return result.length > 0 ? result[0].version : 0;
    }

    async updateVersion(qr?: QueryRunner, version?: number) {
        const executor = qr || this.dataSource;
        await executor.query(`
            INSERT INTO auth_schema_meta (version) VALUES ($1)
        `, [version]);
    }
}
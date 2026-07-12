import { QueryRunner } from 'typeorm';
import { AuthMigration } from './auth.migration.v1';
export declare class AuthMigrationV2 implements AuthMigration {
    static version: number;
    get version(): number;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}

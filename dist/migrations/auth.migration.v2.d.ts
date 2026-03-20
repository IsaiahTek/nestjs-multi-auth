import { QueryRunner } from 'typeorm';
import { AuthMigration } from './auth.migration.v1';
export declare class AuthMigrationV2 implements AuthMigration {
    version: number;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}

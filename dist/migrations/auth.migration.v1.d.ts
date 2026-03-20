import { QueryRunner } from 'typeorm';
export interface AuthMigration {
    version: number;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
export declare class AuthMigrationV1 implements AuthMigration {
    down(queryRunner: QueryRunner): Promise<void>;
    version: number;
    up(queryRunner: QueryRunner): Promise<void>;
}

import { DataSource, QueryRunner } from "typeorm";
export declare class AuthMigrationService {
    private dataSource;
    constructor(dataSource: DataSource);
    runMigrations(): Promise<void>;
    ensureMetaTable(qr?: QueryRunner): Promise<void>;
    getCurrentVersion(qr?: QueryRunner): Promise<number>;
    updateVersion(qr?: QueryRunner, version?: number): Promise<void>;
}

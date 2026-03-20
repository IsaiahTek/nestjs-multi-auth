"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const auth_migrations_1 = require("./auth.migrations");
let AuthMigrationService = class AuthMigrationService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async runMigrations() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await this.ensureMetaTable(queryRunner);
        const currentVersion = await this.getCurrentVersion(queryRunner);
        const pendingMigrations = auth_migrations_1.AuthMigrations.filter((m) => m.prototype.version > currentVersion);
        for (const MigrationClass of pendingMigrations) {
            const migration = new MigrationClass();
            await queryRunner.startTransaction();
            try {
                await migration.up(queryRunner);
                await this.updateVersion(queryRunner, migration.version);
                await queryRunner.commitTransaction();
            }
            catch (err) {
                await queryRunner.rollbackTransaction();
                throw err;
            }
        }
        await queryRunner.release();
    }
    async ensureMetaTable(qr) {
        await qr.query(`
            CREATE TABLE IF NOT EXISTS auth_schema_meta (
            id SERIAL PRIMARY KEY,
            version INT NOT NULL,
            updated_at TIMESTAMP DEFAULT now()
            )
        `);
    }
    async getCurrentVersion(qr) {
        const result = await qr.query(`
            SELECT version FROM auth_schema_meta ORDER BY version DESC LIMIT 1
        `);
        return result.length > 0 ? result[0].version : 0;
    }
    async updateVersion(qr, version) {
        await qr.query(`
            INSERT INTO auth_schema_meta (version) VALUES ($1)
        `, [version]);
    }
};
exports.AuthMigrationService = AuthMigrationService;
exports.AuthMigrationService = AuthMigrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AuthMigrationService);
//# sourceMappingURL=migration.service.js.map
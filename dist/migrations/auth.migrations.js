"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMigrations = void 0;
const auth_migration_v1_1 = require("./auth.migration.v1");
const auth_migration_v2_1 = require("./auth.migration.v2");
exports.AuthMigrations = [
    auth_migration_v1_1.AuthMigrationV1,
    auth_migration_v2_1.AuthMigrationV2,
];
//# sourceMappingURL=auth.migrations.js.map
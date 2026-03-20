import { OnModuleInit } from "@nestjs/common";
import { AuthMigrationService } from "./migration.runner";
import { AuthModuleOptions } from "../auth/interfaces/auth-module-options.interface";
export declare class AuthSchemaInitializer implements OnModuleInit {
    private migrationService;
    private options;
    constructor(migrationService: AuthMigrationService, options: AuthModuleOptions);
    onModuleInit(): Promise<void>;
}

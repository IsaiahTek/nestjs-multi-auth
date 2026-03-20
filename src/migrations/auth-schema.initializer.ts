import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { AuthMigrationService } from "./migration.service";
import { AUTH_MODULE_OPTIONS } from "../auth/auth.module";
import { AuthModuleOptions } from "../auth/interfaces/auth-module-options.interface";

@Injectable()
export class AuthSchemaInitializer implements OnModuleInit {
    constructor(
        private migrationService: AuthMigrationService,
        @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions
    ) { }

    async onModuleInit() {
        if (this.options.autoMigrate) {
            await this.migrationService.runMigrations();
        }
    }
}
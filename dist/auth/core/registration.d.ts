import { Provider } from "@nestjs/common";
import { AuthModuleOptions } from "../interfaces/auth-module-options.interface";
export declare const createStrategyProviders: (options: AuthModuleOptions) => Provider[];

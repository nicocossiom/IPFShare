import { RegistryEntry } from "../registry.js";
export type AppConfig = {
    user: RegistryEntry;
};
export declare function getAppConfig(): Promise<undefined | AppConfig>;
export declare function getAppConfigAndPromptIfUsernameInvalid(daemon?: boolean): Promise<AppConfig>;
export declare function ensureAppConfig(): Promise<AppConfig>;

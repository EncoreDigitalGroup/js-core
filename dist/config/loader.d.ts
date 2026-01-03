import { CoreConfig } from "./types";
export declare const CONFIG_FILE_NAME = "core.config.ts";
export declare function __hasConfigFile(projectRoot?: string): boolean;
export declare function __loadConfig(projectRoot?: string): CoreConfig;

import { CoreConfig } from "./types";
export declare const CONFIG_FILE_NAME = "core.config.ts";
export declare function hasConfigFile(projectRoot?: string): boolean;
export declare function loadConfig(projectRoot?: string): CoreConfig;

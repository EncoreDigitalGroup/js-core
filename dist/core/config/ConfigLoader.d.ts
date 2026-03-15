import { CoreConfig } from "./ConfigTypes";
export declare class ConfigLoader {
    static readonly CONFIG_FILE_NAME = "tsfmt.config.ts";
    private static configCache;
    static clearCache(): void;
    static getConfigFilePath(projectRoot?: string): string;
    static createSampleConfig(projectRoot?: string, overwrite?: boolean): void;
    static getCacheStats(): {
        size: number;
        keys: string[];
    };
    private static getFileModTime;
    static hasConfigFile(projectRoot?: string): boolean;
    private static transpileTypeScript;
    private static loadTypeScriptConfig;
    private static loadConfigWithCache;
    static loadConfig(projectRoot?: string, validate?: boolean): CoreConfig;
    static loadConfigWithoutValidation(projectRoot?: string): CoreConfig;
    static reloadConfig(projectRoot?: string): CoreConfig;
}

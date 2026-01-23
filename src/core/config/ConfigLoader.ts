/*
* Copyright (c) 2025. Encore Digital Group.
* All Rights Reserved.
*/

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { ConfigDefaults } from "./ConfigDefaults";
import { ConfigMerger } from "./ConfigMerger";
import { CoreConfig } from "./ConfigTypes";
import { ConfigValidator } from "./ConfigValidator";


/** Configuration loader that handles TypeScript config files */
export class ConfigLoader {
    /** Config file name that users should create */
    static readonly CONFIG_FILE_NAME = "tsfmt.config.ts";

    /** Cache for loaded configurations to avoid repeated file reads */
    private static configCache = new Map<string, { config: CoreConfig; mtime: number }>();

    /** Clears the configuration cache */
    static clearCache(): void {
        this.configCache.clear();
    }

    /**
    * Gets the path to the config file
    * @param projectRoot - The root directory of the project
    * @returns Full path to the config file
    */
    static getConfigFilePath(projectRoot: string = process.cwd()): string {
        return path.join(projectRoot, this.CONFIG_FILE_NAME);
    }

    /**
    * Creates a sample configuration file
    * @param projectRoot - The root directory of the project
    * @param overwrite - Whether to overwrite existing file (default: false)
    * @throws Error if file exists and overwrite is false
    */
    static createSampleConfig(projectRoot: string = process.cwd(), overwrite: boolean = false): void {
        const configPath = this.getConfigFilePath(projectRoot);

        if (fs.existsSync(configPath) && !overwrite) {
            throw new Error(`Configuration file already exists at ${configPath}. Use overwrite=true to replace it.`);
        }

        const sampleConfig = `/*
* tsfmt Configuration File
*
* This file defines the configuration for tsfmt formatting.
* All options are optional - defaults will be used for missing values.
*/

import { CoreConfig } from "tsfmt";

const config: CoreConfig = {
    // Enable/disable index file generation
    indexGeneration: {
        enabled: true,
        directories: ConfigDefaults.getDefaultIndexDirectories(),
        updateMainIndex: true,
    },

    // Code style configuration
    codeStyle: {
        enabled: true,
        quoteStyle: "double",
        semicolons: "always",
        indentWidth: 4,
        lineWidth: 120,
        },

    // Import organization
    imports: {
        enabled: true,
        sortImports: true,
        removeUnused: true,
        groupImports: true,
    },

    // AST-based sorting
    sorting: {
        enabled: true,
        classMembers: { enabled: true },
        fileDeclarations: { enabled: true },
    },

    // Spacing rules
    spacing: {
        enabled: false,
        betweenDeclarations: true,
        beforeReturns: true,
    },

    // JSON file sorting
    packageJson: { enabled: true },
    tsConfig: { enabled: true },
    };

export default config;
`;

        fs.writeFileSync(configPath, sampleConfig, "utf-8");
    }

    /**
    * Gets cache statistics for debugging
    * @returns Object with cache information
    */
    static getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.configCache.size,
            keys: Array.from(this.configCache.keys())
        };
    }

    /**
    * Gets file modification time for cache invalidation
    * @param filePath - Path to the file
    * @returns File modification time in milliseconds
    */
    private static getFileModTime(filePath: string): number {
        try {
            return fs.statSync(filePath).mtime.getTime();
        } catch {
            return 0;
        }
    }

    /**
    * Checks if a tsfmt.config.ts file exists in the project
    * @param projectRoot - The root directory of the project (defaults to current working directory)
    * @returns true if tsfmt.config.ts exists
    */
    static hasConfigFile(projectRoot: string = process.cwd()): boolean {
        const configPath = path.join(projectRoot, this.CONFIG_FILE_NAME);
        return fs.existsSync(configPath);
    }

    /**
    * Transpiles TypeScript code to JavaScript
    * @param code - TypeScript code to transpile
    * @returns Transpiled JavaScript code
    */
    private static transpileTypeScript(code: string): string {
        const result = ts.transpileModule(code, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2015,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        });

        return result.outputText;
    }

    /**
    * Loads and evaluates a TypeScript config file
    * @param filePath - Path to the config file
    * @returns Partial configuration from the file
    * @throws Error if the config file is invalid
    */
    private static loadTypeScriptConfig(filePath: string): Partial<CoreConfig> {
        try {
            const code = fs.readFileSync(filePath, "utf-8");
            const transpiled = this.transpileTypeScript(code);

            // Create a temporary module to evaluate the code
            const module: {
                exports: any;
            } = {exports: {}};

            const exports = module.exports;

            // Create a require function that can resolve relative imports
            const requireFunc = (moduleName: string) => {
                if (moduleName.startsWith(".")) {
                    // Handle relative imports
                    const resolvedPath = path.resolve(path.dirname(filePath), moduleName);
                    return require(resolvedPath);
                }
                return require(moduleName);
            };

            // Execute the transpiled code
            const func = new Function("exports", "module", "require", "__filename", "__dirname", transpiled);
            func(exports, module, requireFunc, filePath, path.dirname(filePath));

            // Get the default export or the exports object
            const config = module.exports.default || module.exports;

            if (typeof config !== "object" || config === null) {
                throw new Error(`${this.CONFIG_FILE_NAME} must export a configuration object. Found: ${typeof config}`);
            }

            return config;
        } catch (error) {
            throw new Error(`Failed to load ${this.CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
    * Loads the configuration from cache if valid, otherwise from file
    * @param filePath - Path to the config file
    * @returns Loaded configuration
    */
    private static loadConfigWithCache(filePath: string): Partial<CoreConfig> {
        const currentMtime = this.getFileModTime(filePath);
        const cached = this.configCache.get(filePath);

        if (cached && cached.mtime === currentMtime) {
            return cached.config;
        }

        const config = this.loadTypeScriptConfig(filePath);
        this.configCache.set(filePath, {config, mtime: currentMtime});

        return config;
    }

    /**
    * Loads the configuration from tsfmt.config.ts if it exists, otherwise returns default config
    * @param projectRoot - The root directory of the project (defaults to current working directory)
    * @param validate - Whether to validate the configuration (default: true)
    * @returns The merged configuration
    */
    static loadConfig(projectRoot: string = process.cwd(), validate: boolean = true): CoreConfig {
        const configPath = this.getConfigFilePath(projectRoot);

        if (!fs.existsSync(configPath)) {
            // No config file found, return default configuration
            return ConfigDefaults.getDefaultConfig();
        }

        try {
            const userConfig = this.loadConfigWithCache(configPath);
            const mergedConfig = ConfigMerger.merge(userConfig);

            if (validate) {
                ConfigValidator.validateOrThrow(mergedConfig);
            }

            return mergedConfig;
        } catch (error) {
            console.error(`Error loading configuration from ${configPath}:`);
            console.error(error instanceof Error ? error.message : String(error));
            console.error("Falling back to default configuration.");

            return ConfigDefaults.getDefaultConfig();
        }
    }

    /**
    * Loads configuration without validation (for debugging or inspection)
    * @param projectRoot - The root directory of the project
    * @returns The merged configuration without validation
    */
    static loadConfigWithoutValidation(projectRoot: string = process.cwd()): CoreConfig {
        return this.loadConfig(projectRoot, false);
    }

    /**
    * Reloads configuration by clearing cache and loading fresh
    * @param projectRoot - The root directory of the project
    * @returns The reloaded configuration
    */
    static reloadConfig(projectRoot: string = process.cwd()): CoreConfig {
        const configPath = this.getConfigFilePath(projectRoot);
        this.configCache.delete(configPath);
        return this.loadConfig(projectRoot);
    }
}
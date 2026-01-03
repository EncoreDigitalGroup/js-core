/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig, defaultConfig, __mergeConfig} from "./types";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

/**
 * Transpiles TypeScript code to JavaScript
 */

function transpileTypeScript(code: string): string {
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
 * Config file name that users should create
 */
export const CONFIG_FILE_NAME = "core.config.ts";

/**
 * Loads and evaluates a TypeScript config file
 */
function loadTypeScriptConfig(filePath: string): Partial<CoreConfig> {
    try {
        const code = fs.readFileSync(filePath, "utf-8");
        const transpiled = transpileTypeScript(code);
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
            throw new Error(`${CONFIG_FILE_NAME} must export a configuration object. Found: ${typeof config}`);
        }

        return config;
    } catch (error) {
        throw new Error(
            `Failed to load ${CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * Checks if a core.config.ts file exists in the project
 *
 * @param projectRoot - The root directory of the project (defaults to current working directory)
 * @returns true if core.config.ts exists
 */
export function __hasConfigFile(projectRoot: string = process.cwd()): boolean {
    const configPath = path.join(projectRoot, CONFIG_FILE_NAME);

    return fs.existsSync(configPath);
}

/**
 * Loads the configuration from core.config.ts if it exists, otherwise returns default config
 *
 * @param projectRoot - The root directory of the project (defaults to current working directory)
 * @returns The merged configuration
 */
export function __loadConfig(projectRoot: string = process.cwd()): CoreConfig {
    const configPath = path.join(projectRoot, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
        // No config file found, return default configuration
        return defaultConfig;
    }
    try {
        const userConfig = loadTypeScriptConfig(configPath);

        return __mergeConfig(userConfig);
    } catch (error) {
        console.error(`Error loading configuration from ${configPath}:`);
        console.error(error instanceof Error ? error.message : String(error));
        console.error("Falling back to default configuration.");

        return defaultConfig;
    }
}

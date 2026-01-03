#!/usr/bin/env node
/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {__loadConfig, __hasConfigFile} from "./config";
import type {CoreConfig} from "./config";
import {__sortClassMembersInDirectory} from "./sortClassMembers";
import {__sortPackageFile} from "./sortPackage";
import {__sortTsConfigFile} from "./sortTSConfig";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as prettier from "prettier";

/**
 * Checks if a Prettier config file exists in the target directory
 */
function hasPrettierConfig(targetDir: string): boolean {
    const possibleConfigs = [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.yml",
        ".prettierrc.yaml",
        ".prettierrc.toml",
        ".prettier.cjs",
        "prettier.config.js",
        ".prettierrc.config.js",
    ];
    for (const config of possibleConfigs) {
        if (fs.existsSync(path.join(targetDir, config))) {
            return true;
        }
    }

    return false;
}

/**
 * Runs Prettier on files based on configuration
 */
async function runPrettier(targetDir: string, prettierConfig: CoreConfig["prettier"], dryRun: boolean): Promise<void> {
    if (!prettierConfig) {
        return;
    }
    try {
        const include = prettierConfig.include || ["**/*.{js,ts,jsx,tsx}"];
        const exclude = prettierConfig.exclude || [];
        // Always exclude these critical directories
        const criticalExcludes = ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
        const finalExclude = [...new Set([...exclude, ...criticalExcludes])];
        // Convert include patterns to files
        const files = include.flatMap(pattern =>
            glob.sync(pattern, {
                cwd: targetDir,
                ignore: finalExclude,
            }),
        );
        console.info(`Running Prettier on ${files.length} files...`);
        for (const file of files) {
            try {
                const filePath = path.join(targetDir, file);
                const fileContent = fs.readFileSync(filePath, "utf8");
                const formatted = await prettier.format(fileContent, {
                    ...prettierConfig.options,
                    filepath: filePath,
                });
                if (!dryRun && formatted !== fileContent) {
                    fs.writeFileSync(filePath, formatted);
                    console.log(`✨ Formatted: ${file}`);
                }
            } catch (fileError) {
                console.error(`Error formatting file ${file}:`, (fileError as Error).message);
            }
        }
    } catch (error) {
        console.error("Error while running Prettier:", (error as Error).message);
        throw error;
    }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    // Parse command line arguments
    let targetDir = process.cwd();
    let dryRun = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--dry") {
            dryRun = true;
        } else if (!arg.startsWith("-")) {
            targetDir = path.resolve(arg);
        } else {
            console.error(`Error: Unsupported option "${arg}". Only --dry is supported.`);
            process.exit(1);
        }
    }
    try {
        // Load configuration
        const config = __loadConfig(targetDir);
        // Log if custom config is being used
        if (__hasConfigFile(targetDir)) {
            console.log("Using custom configuration from core.config.ts");
        }
        // Sort package.json
        if (config.packageJson?.enabled) {
            const packagePath = path.join(targetDir, "package.json");
            if (fs.existsSync(packagePath)) {
                console.log(`Processing ${packagePath}...`);
                __sortPackageFile(packagePath, {
                    customSortOrder: config.packageJson.customSortOrder,
                    indentation: config.packageJson.indentation,
                    dryRun,
                });
            }
        }
        // Sort tsconfig.json
        if (config.tsConfig?.enabled) {
            const tsconfigPath = path.join(targetDir, "tsconfig.json");
            if (fs.existsSync(tsconfigPath)) {
                console.log(`Processing ${tsconfigPath}...`);
                __sortTsConfigFile(tsconfigPath, {
                    indentation: config.tsConfig.indentation,
                    dryRun,
                });
            }
        }
        // Sort class members and file declarations
        if (
            config.sorters?.classMembers?.enabled ||
            config.sorters?.reactComponents?.enabled ||
            config.sorters?.fileDeclarations?.enabled
        ) {
            console.log("Sorting class members and file declarations...");
            __sortClassMembersInDirectory(config, targetDir, dryRun);
        }
        // Run Prettier
        if (config.prettier?.enabled) {
            const shouldSkip = config.prettier.skipIfConfigExists && hasPrettierConfig(targetDir);
            if (!shouldSkip) {
                await runPrettier(targetDir, config.prettier, dryRun);
            } else {
                console.log("Skipping Prettier (config file exists in project)");
            }
        }
        if (dryRun) {
            console.info("Dry run completed. No files were modified.");
        } else {
            console.info("Formatting completed successfully.");
        }
    } catch (error) {
        console.error("Error during formatting:", (error as Error).message);
        process.exit(1);
    }
}
// Run the CLI
main();

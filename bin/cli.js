#!/usr/bin/env node
/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
const dist = require("../dist");
const {sortPackageFile, sortTsConfigFile} = dist;
const loadConfig = dist.loadConfig || null;
const hasConfigFile = dist.hasConfigFile || null;
const defaultConfig = dist.defaultConfig || null;
const sortClassMembersInDirectory = dist.sortClassMembersInDirectory || null;
const path = require("path");
const prettier = require("prettier");
const fs = require("fs");
const glob = require("glob");
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

// Load configuration (or use fallback defaults if not available yet)
let config;
if (loadConfig && defaultConfig) {
    config = loadConfig(targetDir);
    // Log if custom config is being used
    if (hasConfigFile && hasConfigFile(targetDir)) {
        console.log("Using custom configuration from core.config.ts");
    }
} else {
    // Fallback to hardcoded defaults if config system not yet built
    config = {
        prettier: {
            enabled: true,
            skipIfConfigExists: true,
            options: {
                plugins: ["@trivago/prettier-plugin-sort-imports"],
                bracketSpacing: false,
                trailingComma: "all",
                arrowParens: "avoid",
                tabWidth: 4,
                editorconfig: true,
                useTabs: false,
                printWidth: 120,
                importOrderSeparation: true,
                singleQuote: false,
                semi: true,
            },
            include: ["**/*.{js,ts,jsx,tsx}"],
            exclude: [],
        },
        packageJson: {
            enabled: true,
            customSortOrder: [
                "name",
                "type",
                "author",
                "version",
                "description",
                "publishConfig",
                "keywords",
                "homepage",
                "engines",
                "dependencies",
                "devDependencies",
                "scripts",
                "types",
                "main",
                "module",
                "exports",
                "files",
                "repository",
                "bugs",
            ],
            indentation: 4,
        },
        tsConfig: {
            enabled: true,
            indentation: 4,
        },
        sorters: {
            classMembers: {enabled: true},
            reactComponents: {enabled: true},
            fileDeclarations: {enabled: true},
            include: ["**/*.{ts,tsx}"],
            exclude: [],
        },
    };
}

function hasPrettierConfig(targetDir) {
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

async function runPrettier(targetDir, prettierConfig, dryRun) {
    try {
        const include = prettierConfig.include || ["**/*.{js,ts,jsx,tsx}"];
        const exclude = prettierConfig.exclude || [];

        // Always exclude these critical directories
        const criticalExcludes = ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
        const finalExclude = [...new Set([...exclude, ...criticalExcludes])];

        // Convert include patterns to a single pattern for glob
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
                console.error(`Error formatting file ${file}:`, fileError.message);
            }
        }
    } catch (error) {
        console.error("Error while running Prettier:", error.message);
        throw error;
    }
}

(async () => {
    try {
        // Sort package.json
        if (config.packageJson.enabled) {
            const packagePath = path.join(targetDir, "package.json");
            if (fs.existsSync(packagePath)) {
                console.log(`Processing ${packagePath}...`);
                sortPackageFile(packagePath, {
                    customSortOrder: config.packageJson.customSortOrder,
                    indentation: config.packageJson.indentation,
                    dryRun,
                });
            }
        }

        // Sort tsconfig.json
        if (config.tsConfig.enabled) {
            const tsconfigPath = path.join(targetDir, "tsconfig.json");
            if (fs.existsSync(tsconfigPath)) {
                console.log(`Processing ${tsconfigPath}...`);
                sortTsConfigFile(tsconfigPath, {
                    indentation: config.tsConfig.indentation,
                    dryRun,
                });
            }
        }

        // Sort class members and file declarations
        if (
            sortClassMembersInDirectory &&
            (config.sorters.classMembers.enabled ||
                config.sorters.reactComponents.enabled ||
                config.sorters.fileDeclarations.enabled)
        ) {
            console.log("Sorting class members and file declarations...");
            sortClassMembersInDirectory(targetDir, {
                dryRun,
                classConfig: config.sorters.classMembers.enabled
                    ? {
                          order: config.sorters.classMembers.order,
                          groupByVisibility: config.sorters.classMembers.groupByVisibility,
                          respectDependencies: config.sorters.classMembers.respectDependencies,
                      }
                    : null,
                reactConfig: config.sorters.reactComponents.enabled
                    ? {
                          order: config.sorters.reactComponents.order,
                          groupByVisibility: config.sorters.reactComponents.groupByVisibility,
                          respectDependencies: config.sorters.reactComponents.respectDependencies,
                      }
                    : null,
                fileConfig: config.sorters.fileDeclarations.enabled
                    ? {
                          order: config.sorters.fileDeclarations.order,
                          respectDependencies: config.sorters.fileDeclarations.respectDependencies,
                      }
                    : null,
                include: config.sorters.include,
                exclude: config.sorters.exclude,
            });
        }

        // Run Prettier
        if (config.prettier.enabled) {
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
        console.error("Error during formatting:", error.message);
        process.exit(1);
    }
})();
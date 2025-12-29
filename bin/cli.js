#!/usr/bin/env node
/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
const dist = require("../dist");
const {sortPackageFile, sortTsConfigFile} = dist;
const sortClassMembersInDirectory = dist.sortClassMembersInDirectory || null;
const path = require("path");
const prettier = require("prettier");
const fs = require("fs");
const glob = require("glob");
const args = process.argv.slice(2);
const options = {
    indentation: 4,
    dryRun: false,
};
const prettierConfig = {
    plugins: [require.resolve("@trivago/prettier-plugin-sort-imports")],
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
};
let targetDir = process.cwd();
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry") {
        options.dryRun = true;
    } else if (!arg.startsWith("-")) {
        targetDir = path.resolve(arg);
    } else {
        console.error(`Error: Unsupported option "${arg}". Only --dry is supported.`);
        process.exit(1);
    }
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
    // Check for Prettier config files
    for (const config of possibleConfigs) {
        if (fs.existsSync(path.join(targetDir, config))) {
            return true;
        }
    }
    return false;
}
async function runPrettier(targetDir, dryRun) {
    try {
        // Get Prettier config from this package
        const files = glob.sync("**/*.{js,ts,jsx,tsx}", {
            cwd: targetDir,
            ignore: ["node_modules/**", "dist/**", "vendor/**"],
        });
        console.info(`Running Prettier on ${files.length} files...`);
        for (const file of files) {
            try {
                const filePath = path.join(targetDir, file);
                const fileContent = fs.readFileSync(filePath, "utf8");
                // Format the file
                const formatted = await prettier.format(fileContent, {
                    ...prettierConfig,
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
        // Format package.json
        const packagePath = path.join(targetDir, "package.json");
        console.log(`Processing ${packagePath}...`);
        sortPackageFile(packagePath, options);
        // Format tsconfig.json
        const tsconfigPath = path.join(targetDir, "tsconfig.json");
        console.log(`Processing ${tsconfigPath}...`);
        sortTsConfigFile(tsconfigPath, options);
        // Sort class members in TypeScript/JavaScript files
        if (sortClassMembersInDirectory) {
            console.log("Sorting class members...");
            sortClassMembersInDirectory(targetDir, {dryRun: options.dryRun});
        }
        // Run Prettier on all files
        if (!hasPrettierConfig(targetDir)) {
            await runPrettier(targetDir, options.dryRun);
        }
        if (options.dryRun) {
            console.info("Dry run completed. No files were modified.");
        } else {
            console.info("Formatting completed successfully.");
        }
    } catch (error) {
        console.error("Error during formatting:", error.message);
        process.exit(1);
    }
})();

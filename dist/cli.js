#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const sortClassMembers_1 = require("./sortClassMembers");
const sortPackage_1 = require("./sortPackage");
const sortTSConfig_1 = require("./sortTSConfig");
const fs = __importStar(require("fs"));
const glob = __importStar(require("glob"));
const path = __importStar(require("path"));
const prettier = __importStar(require("prettier"));
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
    if (!prettierConfig) {
        return;
    }
    try {
        const include = prettierConfig.include || ["**/*.{js,ts,jsx,tsx}"];
        const exclude = prettierConfig.exclude || [];
        const criticalExcludes = ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
        const finalExclude = [...new Set([...exclude, ...criticalExcludes])];
        const files = include.flatMap(pattern => glob.sync(pattern, {
            cwd: targetDir,
            ignore: finalExclude,
        }));
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
            }
            catch (fileError) {
                console.error(`Error formatting file ${file}:`, fileError.message);
            }
        }
    }
    catch (error) {
        console.error("Error while running Prettier:", error.message);
        throw error;
    }
}
async function main() {
    const args = process.argv.slice(2);
    let targetDir = process.cwd();
    let dryRun = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--dry") {
            dryRun = true;
        }
        else if (!arg.startsWith("-")) {
            targetDir = path.resolve(arg);
        }
        else {
            console.error(`Error: Unsupported option "${arg}". Only --dry is supported.`);
            process.exit(1);
        }
    }
    try {
        const config = (0, config_1.loadConfig)(targetDir);
        if ((0, config_1.hasConfigFile)(targetDir)) {
            console.log("Using custom configuration from core.config.ts");
        }
        if (config.packageJson?.enabled) {
            const packagePath = path.join(targetDir, "package.json");
            if (fs.existsSync(packagePath)) {
                console.log(`Processing ${packagePath}...`);
                (0, sortPackage_1.sortPackageFile)(packagePath, {
                    customSortOrder: config.packageJson.customSortOrder,
                    indentation: config.packageJson.indentation,
                    dryRun,
                });
            }
        }
        if (config.tsConfig?.enabled) {
            const tsconfigPath = path.join(targetDir, "tsconfig.json");
            if (fs.existsSync(tsconfigPath)) {
                console.log(`Processing ${tsconfigPath}...`);
                (0, sortTSConfig_1.sortTsConfigFile)(tsconfigPath, {
                    indentation: config.tsConfig.indentation,
                    dryRun,
                });
            }
        }
        if (config.sorters?.classMembers?.enabled ||
            config.sorters?.reactComponents?.enabled ||
            config.sorters?.fileDeclarations?.enabled) {
            console.log("Sorting class members and file declarations...");
            (0, sortClassMembers_1.sortClassMembersInDirectory)(config, targetDir, dryRun);
        }
        if (config.prettier?.enabled) {
            const shouldSkip = config.prettier.skipIfConfigExists && hasPrettierConfig(targetDir);
            if (!shouldSkip) {
                await runPrettier(targetDir, config.prettier, dryRun);
            }
            else {
                console.log("Skipping Prettier (config file exists in project)");
            }
        }
        if (dryRun) {
            console.info("Dry run completed. No files were modified.");
        }
        else {
            console.info("Formatting completed successfully.");
        }
    }
    catch (error) {
        console.error("Error during formatting:", error.message);
        process.exit(1);
    }
}
main();

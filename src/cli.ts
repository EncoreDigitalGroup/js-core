import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import type { CoreConfig } from "./config";
import { hasConfigFile, loadConfig } from "./config";
import { FormatterPipeline } from "./core/pipeline/FormatterPipeline";
import { sortPackageFile } from "./sortPackage";
import { sortTsConfigFile } from "./sortTSConfig";


/**
* Format files using the FormatterPipeline
*/
async function formatFiles(targetDir: string, config: CoreConfig, dryRun: boolean): Promise<void> {
    // Get include/exclude patterns
    const include = config.sorting?.include || ["**/*.{ts,tsx,js,jsx}"];
    const exclude = config.sorting?.exclude || [];
    // Always exclude these critical directories
    const criticalExcludes = ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"];
    const finalExclude = [...new Set([...exclude, ...criticalExcludes])];
    // Find files to format
    const files = include.flatMap(pattern => glob.sync(pattern, {
        cwd: targetDir,
        ignore: finalExclude,
        absolute: true,
}));

    if (files.length === 0) {
        console.info("No files found to format.");
        return;
    }
    console.info(`Formatting ${files.length} files...`);
    // Create pipeline

    const pipeline = new FormatterPipeline(config);
    // Format each file

    let formattedCount = 0;

    for (const file of files) {
        try {
            const context = await pipeline.formatFile(file, dryRun);

            if (context.changed) {
                formattedCount++;

                if (!dryRun) {
                    console.log(`✨ Formatted: ${path.relative(targetDir, file)}`);
                }
            }
        } catch (error) {
            console.error(`Error formatting file ${file}:`, (error as Error).message);
        }
    }

    if (dryRun) {
        console.info(`Would format ${formattedCount} of ${files.length} files.`);
    } else {
        console.info(`Formatted ${formattedCount} of ${files.length} files.`);
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

        const config = loadConfig(targetDir);
        // Log if custom config is being used

        if (hasConfigFile(targetDir)) {
            console.log("Using custom configuration from core.config.ts");
        }
        // Sort package.json

        if (config.packageJson?.enabled) {
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

        if (config.tsConfig?.enabled) {
            const tsconfigPath = path.join(targetDir, "tsconfig.json");

            if (fs.existsSync(tsconfigPath)) {
                console.log(`Processing ${tsconfigPath}...`);
                sortTsConfigFile(tsconfigPath, {
                    indentation: config.tsConfig.indentation,
                    dryRun,
});
            }
        }
        // Format files using the new pipeline
        // Check if any formatters are enabled

        if (config.codeStyle?.enabled ||

            config.imports?.enabled ||
            config.sorting?.enabled ||
            config.spacing?.enabled) {
            await formatFiles(targetDir, config, dryRun);
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
main()

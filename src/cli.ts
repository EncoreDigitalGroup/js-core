import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import "reflect-metadata";
import {ConfigLoader, ConfigValidator, Container, CoreConfig, FormatterPipeline, RestrictionChecker, ServiceRegistration} from "./core";
import {sortPackageFile} from "./sortPackage";
import {sortTsConfigFile} from "./sortTSConfig";

/** Discover the files a directory run would format, using the same include/exclude globs as `formatDirectory`. */
function discoverTargetFiles(targetDir: string, config: CoreConfig): string[] {
    const include = config.sorting?.include || ["**/*.{ts,tsx,js,jsx}"];
    const exclude = config.sorting?.exclude || [];

    // Always exclude these critical directories
    const criticalExcludes = ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"];
    const finalExclude = [...new Set([...exclude, ...criticalExcludes])];

    return include.flatMap(pattern => glob.sync(pattern, {
        cwd: targetDir,
        ignore: finalExclude,
        absolute: true,
    }));
}

/** Format files in a directory using the FormatterPipeline */
async function formatDirectory(targetDir: string, config: CoreConfig, dryRun: boolean, files: string[]): Promise<void> {
    const container = new Container();
    ServiceRegistration.registerServices(container, config);

    if (files.length === 0) {
        console.info("No files found to format.");

        return;
    }

    console.info(`Formatting ${files.length} files...`);

    // Resolve pipeline from DI container
    const pipeline = container.resolve<FormatterPipeline>("FormatterPipeline");

    // Format each file
    let formattedCount = 0;

    for (const file of files) {
        try {
            const context = await pipeline.formatFile(file, dryRun);
            if (context.changed) {
                formattedCount++;

                if (!dryRun) {
                    console.log(`📊  Formatted: ${path.relative(targetDir, file)}`);
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

/** Format a single file using the FormatterPipeline */
async function formatSingleFile(filePath: string, config: CoreConfig, dryRun: boolean): Promise<void> {
    const container = new Container();
    ServiceRegistration.registerServices(container, config);

    const pipeline = container.resolve<FormatterPipeline>("FormatterPipeline");
    try {
        const context = await pipeline.formatFile(filePath, dryRun);
        if (context.changed) {
            if (dryRun) {
                console.info(`Would format: ${filePath}`);
            } else {
                console.log(`📊  Formatted: ${filePath}`);
            }
        } else {
            console.info(`No changes needed: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error formatting file ${filePath}:`, (error as Error).message);
    }
}

/** Check if a path is a supported file type */
function isSupportedFile(filePath: string): boolean {
    const supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];
    return supportedExtensions.some(ext => filePath.endsWith(ext));
}

/**
 * Read-only architectural-rules gate, run before any formatting. Exits non-zero without formatting a single file
 * when the config is invalid or a `restrictions.imports` rule is violated; runs even under `--dry`.
 */
function runRestrictionGate(files: string[], config: CoreConfig, configDir: string, noGate: boolean): void {
    if (noGate) {
        return;
    }

    const rules = config.restrictions?.imports;
    if (!rules || rules.length === 0) {
        return;
    }

    const configErrors = ConfigValidator.validateRestrictions(rules);
    if (configErrors.length > 0) {
        configErrors.forEach(e => console.error(e));
        process.exit(1);
    }

    const violations = new RestrictionChecker(rules, configDir).check(files);
    if (violations.length > 0) {
        for (const v of violations) {
            console.error(`${path.relative(configDir, v.filePath)}:${v.line}:${v.column}  ${v.message}  (imports "${v.specifier}")`);
        }

        console.error(`${violations.length} restriction violation(s). Formatting skipped — fix these first.`);
        process.exit(1);
    }
}

/** Main CLI function */
async function main(): Promise<void> {
    const args = process.argv.slice(2);

    // Parse command line arguments
    let target = process.cwd();
    let dryRun = false;
    let noGate = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--dry") {
            dryRun = true;
        } else if (arg === "--no-gate") {
            noGate = true;
        } else if (!arg.startsWith("-")) {
            target = path.resolve(arg);
        } else {
            console.error(`Error: Unsupported option "${arg}". Only --dry and --no-gate are supported.`);
            process.exit(1);
        }
    }
    try {
        // Determine if target is a file or directory
        const targetStat = fs.existsSync(target) ? fs.statSync(target) : null;
        const isFile = targetStat?.isFile() ?? false;
        const isDirectory = targetStat?.isDirectory() ?? false;

        if (!targetStat) {
            console.error(`Error: Target "${target}" does not exist.`);
            process.exit(1);
        }

        // For files, load config from the file's directory; for directories, use the target
        const configDir = isFile ? path.dirname(target) : target;
        const config = ConfigLoader.loadConfig(configDir);

        // Log if custom config is being used
        if (ConfigLoader.hasConfigFile(configDir)) {
            console.log("Using custom configuration from tsfmt.config.ts");
        }

        // Handle single file formatting
        if (isFile) {
            if (!isSupportedFile(target)) {
                console.error(`Error: Unsupported file type. Supported: .ts, .tsx, .js, .jsx`);
                process.exit(1);
            }

            if (config.codeStyle?.enabled
                || config.imports?.enabled
                || config.sorting?.enabled
                || config.spacing?.enabled) {
                await formatSingleFile(target, config, dryRun);
            }

            if (dryRun) {
                console.info("Dry run completed. No files were modified.");
            } else {
                console.info("Formatting completed successfully.");
            }

            return;
        }

        // Handle directory formatting
        if (isDirectory) {
            const files = discoverTargetFiles(target, config);
            runRestrictionGate(files, config, configDir, noGate);

            // Sort package.json
            if (config.packageJson?.enabled) {
                const packagePath = path.join(target, "package.json");
                if (fs.existsSync(packagePath)) {
                    console.log(`📦  Processing ${packagePath}...`);

                    sortPackageFile(packagePath, {
                        customSortOrder: config.packageJson.customSortOrder,
                        indentation: config.packageJson.indentation,
                        dryRun,
                    });
                }
            }

            // Sort tsconfig.json
            if (config.tsConfig?.enabled) {
                const tsconfigPath = path.join(target, "tsconfig.json");
                if (fs.existsSync(tsconfigPath)) {
                    console.log(`🔧  Processing ${tsconfigPath}...`);

                    sortTsConfigFile(tsconfigPath, {
                        indentation: config.tsConfig.indentation,
                        dryRun,
                    });
                }
            }

            // Format files using the pipeline
            if (config.codeStyle?.enabled
                || config.imports?.enabled
                || config.sorting?.enabled
                || config.spacing?.enabled) {
                await formatDirectory(target, config, dryRun, files);
            }

            if (dryRun) {
                console.info("Dry run completed. No files were modified.");
            } else {
                console.info("Formatting completed successfully.");
            }
        }
    } catch (error) {
        console.error("Error during formatting:", (error as Error).message);
        process.exit(1);
    }
}

// Run the CLI
main();

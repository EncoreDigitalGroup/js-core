import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import "reflect-metadata";
import {ConfigDefaults, ConfigLoader, ConfigValidator, Container, CoreConfig, FormatterPipeline, RestrictionChecker, ServiceRegistration, sortPackageFile, sortTsConfigFile} from "./core";

/** Check if a path is a supported file type */
function isSupportedFile(filePath: string): boolean {
    const supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];
    return supportedExtensions.some(ext => filePath.endsWith(ext));
}

/** Detect whether a path string contains glob magic characters. */
function hasGlobMagic(p: string): boolean {
    return /[*?[\]{}!+@()]/.test(p);
}

/**
 * Resolve the concrete set of files a run formats. Two models, chosen by whether the CLI passed positional paths:
 *
 * - Config-driven (`cliPaths.length === 0`) — augmenting scan: a full recursive scan of the supported extensions minus
 *   `config.paths.exclude` and the critical excludes, with `config.paths.include` globs added back on top. Include
 *   entries override `paths.exclude` (an excluded-but-included file is added back) but never resurrect a critical dir.
 * - CLI-driven (`cliPaths.length > 0`, already copied into `config.paths.include` by `main`) — narrowing: each entry is
 *   expanded verbatim. A named file is always formatted; a directory is scanned with critical excludes only; a
 *   nonexistent entry with glob magic is matched with critical excludes only. `config.paths.exclude` is never consulted.
 */
function discoverTargetFiles(cwd: string, config: CoreConfig, cliPaths: string[]): string[] {
    const criticalExcludes = ConfigDefaults.getCriticalExcludePatterns();
    const jsGlob = ConfigDefaults.getDefaultJavaScriptIncludePatterns()[0];
    const {include = [], exclude = []} = config.paths ?? {};
    const dedupeSupported = (files: string[]): string[] => [...new Set(files)].filter(isSupportedFile);

    // Config-driven mode: augmenting full scan. An empty `include` adds nothing back, giving the plain `tsfmt .` scan.
    if (cliPaths.length === 0) {
        const base = glob.sync(jsGlob, {cwd, ignore: [...exclude, ...criticalExcludes], absolute: true});
        const added = include.flatMap(p => glob.sync(p, {cwd, ignore: criticalExcludes, absolute: true}));
        return dedupeSupported([...base, ...added]);
    }

    // CLI-driven mode: narrow to exactly the passed paths, exclude bypassed.
    const results: string[] = [];

    for (const p of include) {
        const abs = path.resolve(cwd, p);
        const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
        if (stat?.isFile()) {
            if (!isSupportedFile(abs)) {
                console.error("Error: Unsupported file type. Supported: .ts, .tsx, .js, .jsx");
                process.exit(1);
            }

            results.push(abs);
        } else if (stat?.isDirectory()) {
            results.push(...glob.sync(jsGlob, {cwd: abs, ignore: criticalExcludes, absolute: true}));
        } else if (hasGlobMagic(p)) {
            results.push(...glob.sync(p, {cwd, ignore: criticalExcludes, absolute: true}));
        } else {
            console.error(`Error: Target "${abs}" does not exist.`);
            process.exit(1);
        }
    }

    return dedupeSupported(results);
}

/** Format files in a directory using the FormatterPipeline */
async function formatDirectory(targetDir: string, dryRun: boolean, files: string[], pipeline: FormatterPipeline): Promise<void> {
    if (files.length === 0) {
        console.info("No files found to format.");

        return;
    }

    console.info(`Formatting ${files.length} files...`);

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

    // Parse command line arguments: accumulate every non-flag argument as a positional path.
    const cliPaths: string[] = [];
    let dryRun = false;
    let noGate = false;

    for (const arg of args) {
        if (arg === "--dry") {
            dryRun = true;
        } else if (arg === "--no-gate") {
            noGate = true;
        } else if (!arg.startsWith("-")) {
            cliPaths.push(arg);
        } else {
            console.error(`Error: Unsupported option "${arg}". Only --dry and --no-gate are supported.`);
            process.exit(1);
        }
    }
    try {
        const cwd = process.cwd();
        const config = ConfigLoader.loadConfig(cwd);

        // Log if custom config is being used
        if (ConfigLoader.hasConfigFile(cwd)) {
            console.log("Using custom configuration from tsfmt.config.ts");
        }

        // Passing paths on the CLI replaces paths.include in memory, scoping the run to exactly those paths.
        if (cliPaths.length > 0) {
            config.paths = {...config.paths, include: cliPaths};
        }

        const files = discoverTargetFiles(cwd, config, cliPaths);
        runRestrictionGate(files, config, cwd, noGate);

        // Sort package.json
        if (config.packageJson?.enabled) {
            const packagePath = path.join(cwd, "package.json");
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
            const tsconfigPath = path.join(cwd, "tsconfig.json");
            if (fs.existsSync(tsconfigPath)) {
                console.log(`🔧  Processing ${tsconfigPath}...`);

                sortTsConfigFile(tsconfigPath, {
                    indentation: config.tsConfig.indentation,
                    dryRun,
                });
            }
        }

        const shouldFormat = Boolean(
            config.codeStyle?.enabled
                || config.imports?.enabled
                || config.sorting?.enabled
                || config.spacing?.enabled
        );

        const shouldGenerateIndexes = Boolean(config.indexGeneration?.enabled);
        if (shouldGenerateIndexes || shouldFormat) {
            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = container.resolve<FormatterPipeline>("FormatterPipeline");

            if (shouldGenerateIndexes) {
                pipeline.generateIndexFiles(cwd, dryRun);
            }

            if (shouldFormat) {
                await formatDirectory(cwd, dryRun, files, pipeline);
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
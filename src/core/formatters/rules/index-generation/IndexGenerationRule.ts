/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as fs from "fs";
import * as path from "path";
import {IndexGenerationConfig, IndexGenerationOptions} from "../../../config/ConfigTypes";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/** Rule that generates index.ts files for directories */
export class IndexGenerationRule extends BaseFormattingRule {
    readonly name = "IndexGenerationRule";

    private readonly defaultOptions: IndexGenerationOptions = {
        fileExtension: ".ts",
        indexFileName: "index.ts",
        recursive: true
    };

    private findProjectRoot(filePath: string): string | null {
        let current = path.dirname(filePath);
        while (current !== path.dirname(current)) {
            if (fs.existsSync(path.join(current, "package.json"))) {
                return current;
            }

            current = path.dirname(current);
        }

        return null;
    }

    private isTestDirectory(dirName: string): boolean {
        // Common test directory patterns (not configurable)
        const testDirectories = [
            "__tests__",
            "tests",
            "test",
            "__mocks__",
            "__fixtures__",
            ".storybook",
        ];

        return testDirectories.includes(dirName.toLowerCase())
            || dirName.endsWith(".test")
            || dirName.endsWith(".spec");
    }

    private isTestFile(fileName: string): boolean {
        // Common test file patterns (not configurable)
        const testPatterns = [
            /\.test\.(ts|tsx|js|jsx)$/,
            /\.spec\.(ts|tsx|js|jsx)$/,
            /\.(test|spec)\.(ts|tsx|js|jsx)$/,
            /__tests__/,
            /\.stories\.(ts|tsx|js|jsx)$/,
        ];

        return testPatterns.some(pattern => pattern.test(fileName));
    }

    private generateSingleDirectoryIndex(dir: string, skipPaths: Set<string>, options: IndexGenerationOptions): void {
        try {
            const entries = fs.readdirSync(dir, {withFileTypes: true});
            const exports: string[] = [];

            for (const entry of entries) {
                if (entry.name === options.indexFileName) {
                    continue;
                }

                if (entry.isDirectory()) {
                    // Always skip test directories (not configurable)
                    if (this.isTestDirectory(entry.name)) {
                        continue;
                    }

                    const subDir = path.join(dir, entry.name);
                    if (skipPaths.has(subDir)) {
                        continue;
                    }

                    // Check if subdirectory has an index file
                    const subIndexPath = path.join(subDir, options.indexFileName);
                    if (fs.existsSync(subIndexPath)) {
                        exports.push(`export * from "./${entry.name}";`);
                    }
                } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
                    // Skip .d.ts files when processing regular .ts files
                    if (entry.name.endsWith(".d.ts")) {
                        continue;
                    }

                    // Always skip test files (not configurable)
                    if (this.isTestFile(entry.name)) {
                        continue;
                    }

                    const exportName = entry.name.replace(/\.(ts|tsx)$/, "");
                    exports.push(`export * from "./${exportName}";`);
                }
            }

            if (exports.length === 0) {
                return;
            }

            exports.sort();

            const content = `// Auto-generated exports - do not edit manually
// Run tsfmt to regenerate

${exports.join("\n")}
`;

            const indexPath = path.join(dir, options.indexFileName);
            fs.writeFileSync(indexPath, content, "utf8");
        } catch (error) {
            console.warn(`Warning: Failed to generate index for ${dir}: ${(error as Error).message}`);
        }
    }

    private generateIndexExportRecursive(dir: string, skipPaths: Set<string>, options: IndexGenerationOptions): void {
        try {
            const entries = fs.readdirSync(dir, {withFileTypes: true});
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // Always skip test directories (not configurable)
                    if (this.isTestDirectory(entry.name)) {
                        continue;
                    }

                    const subDir = path.join(dir, entry.name);
                    if (skipPaths.has(subDir)) {
                        continue;
                    }

                    this.generateIndexExportRecursive(subDir, skipPaths, options);
                }
            }

            this.generateSingleDirectoryIndex(dir, skipPaths, options);
        } catch (error) {
            console.warn(`Warning: Failed to process directory ${dir}: ${(error as Error).message}`);
        }
    }

    private generateIndexExport(dir: string, skipPaths: Set<string>, options: IndexGenerationOptions): void {
        if (!fs.existsSync(dir)) {
            return;
        }

        if (options.recursive) {
            this.generateIndexExportRecursive(dir, skipPaths, options);
        } else {
            this.generateSingleDirectoryIndex(dir, skipPaths, options);
        }
    }

    private discoverExportableModules(srcDir: string): string[] {
        try {
            const entries = fs.readdirSync(srcDir, {withFileTypes: true});
            const modules: string[] = [];

            for (const entry of entries) {
                // Skip index.ts itself
                if (entry.name === "index.ts") {
                    continue;
                }

                // Check for directories with index.ts
                if (entry.isDirectory()) {
                    // Always skip test directories (not configurable)
                    if (this.isTestDirectory(entry.name)) {
                        continue;
                    }

                    const indexPath = path.join(srcDir, entry.name, "index.ts");
                    if (fs.existsSync(indexPath)) {
                        modules.push(entry.name);
                    }
                }

                // Check for .d.ts files (like generated.d.ts)
                else if (entry.name.endsWith(".d.ts")) {
                    const moduleName = entry.name.slice(0, -3); // Remove .ts but keep .d
                    modules.push(moduleName);
                }
            }

            return modules.sort();
        } catch (error) {
            console.warn(`Warning: Failed to discover modules in ${srcDir}: ${(error as Error).message}`);

            return [];
        }
    }

    private updateMainIndex(indexPath: string, modules: string[]): void {
        try {
            const exports = modules.map(mod => `export * from "./${mod}";`).join("\n");
            const content = `// Auto-generated exports - do not edit manually
// Run tsfmt to regenerate

${exports}
`;
            fs.writeFileSync(indexPath, content, "utf8");
        } catch (error) {
            console.warn(`Warning: Failed to write main index file: ${(error as Error).message}`);
        }
    }

    private generateIndexFiles(currentFilePath: string): void {
        try {
            const projectRoot = this.findProjectRoot(currentFilePath);
            if (!projectRoot) {
                return;
            }

            const config = this.getIndexGenerationConfig();
            const directories = config?.directories || [];
            const options = {...this.defaultOptions, ...config?.options};
            const skipPaths = new Set(
                (config?.skipDirectories || []).map(d => path.resolve(projectRoot, d))
            );

            for (const dir of directories) {
                const fullDirPath = path.resolve(projectRoot, dir);
                if (skipPaths.has(fullDirPath)) {
                    continue;
                }

                this.generateIndexExport(fullDirPath, skipPaths, options);
            }

            // Update main src/index.ts if configured
            if (config?.updateMainIndex !== false) {
                const srcDir = path.join(projectRoot, "src");
                const mainIndexPath = path.join(srcDir, "index.ts");

                if (fs.existsSync(srcDir)) {
                    const modules = this.discoverExportableModules(srcDir);
                    this.updateMainIndex(mainIndexPath, modules);
                }
            }
        } catch (error) {
            console.warn(`Warning: Failed to generate index files: ${(error as Error).message}`);
        }
    }

    override applyToContext(context: FormatContext): void {
        if (!this.getIndexGenerationConfig()?.enabled) return;
        // This rule operates on the file system, not on individual file content
        // We'll trigger index generation when processing any file in the project
        this.generateIndexFiles(context.filePath);
    }
}

export type {IndexGenerationConfig, IndexGenerationOptions};
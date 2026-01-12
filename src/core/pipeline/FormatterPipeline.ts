/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as fs from "fs/promises";
import * as path from "path";
import {CoreConfig, FormatterOrder} from "../../config/types";
import {ClassMemberFormatter} from "../formatters/ast/ClassMemberFormatter";
import {FileDeclarationFormatter} from "../formatters/ast/FileDeclarationFormatter";
import {IFormatter} from "../formatters/base/IFormatter";
import {ImportOrganizer} from "../formatters/imports/ImportOrganizer";
import {BlankLineFormatter} from "../formatters/spacing/BlankLineFormatter";
import {CodeStyleFormatter} from "../formatters/style/CodeStyleFormatter";

/*
 * Tracks the state of a single formatter execution
 */

export interface FormatterExecution {

    formatterName: string;
    order: FormatterOrder;
    changed: boolean;
    error?: Error;
}

/**
 * Context object tracking the entire pipeline execution
 */

export interface PipelineContext {

    filePath: string;
    originalSource: string;
    currentSource: string;
    executions: FormatterExecution[];
    changed: boolean;
    dryRun: boolean;
}

/**
 * Error thrown when a formatter fails during pipeline execution
 */

export class FormatterError extends Error {

    constructor(public readonly formatterName: string, public readonly filePath: string, public readonly originalError: Error) {
        super(`Formatter '${formatterName}' failed for file '${filePath}': ${originalError.message}`);
        this.name = "FormatterError";
    }
}

/**
 * Orchestrates the execution of multiple formatters in a defined order.
 * Implements fail-fast error handling and supports dry-run mode.
 */

export class FormatterPipeline {

    private formatterOrder: FormatterOrder[];
    private formatters: Map<FormatterOrder, IFormatter[]> = new Map();

    constructor(private readonly config: CoreConfig) {
        this.formatterOrder = config.formatterOrder || [
            FormatterOrder.CodeStyle,
            FormatterOrder.ImportOrganization,
            FormatterOrder.ASTTransformation,
            FormatterOrder.Spacing,
        ];
        this.initializeFormatters();
    }

    /**
     * Add a formatter to the pipeline at a specific order position
     */
    private addFormatter(order: FormatterOrder, formatter: IFormatter): void {

        if (!this.formatters.has(order)) {

            this.formatters.set(order, []);
        }
        this.formatters.get(order)!.push(formatter);
    }

    /**
     * Get all files in a directory recursively
     */
    private async getFilesRecursively(dirPath: string, extensions: string[]): Promise<string[]> {

        const files: string[] = [];
        const entries = await fs.readdir(dirPath, {withFileTypes: true});

        for (const entry of entries) {

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules and other common directories
                if (["node_modules", ".git", "dist", "build"].includes(entry.name)) {

                    continue;
                }

                const subFiles = await this.getFilesRecursively(fullPath, extensions);

                files.push(...subFiles);
            } else if (entry.isFile()) {
                if (extensions.some(ext => entry.name.endsWith(ext))) {

                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    /**
     * Format a file using the configured formatters in sequence
     * @param filePath - Absolute path to the file to format
     * @param dryRun - If true, don't write changes to disk
     * @returns Pipeline context with execution details
     * @throws FormatterError if any formatter fails (fail-fast)
     */
    async formatFile(filePath: string, dryRun = false): Promise<PipelineContext> {
        // Read original source

        const originalSource = await fs.readFile(filePath, "utf-8");
        // Initialize pipeline context
        const context: PipelineContext = {

            filePath,
            originalSource,
            currentSource: originalSource,
            executions: [],
            changed: false,
            dryRun,
        };
        // Execute formatters in order

        for (const order of this.formatterOrder) {

            const formattersAtOrder = this.formatters.get(order);

            if (!formattersAtOrder || formattersAtOrder.length === 0) {

                continue;
            }

            for (const formatter of formattersAtOrder) {
                // Skip if formatter doesn't support this file type

                if (!formatter.shouldFormat(filePath)) {

                    continue;
                }

                const execution: FormatterExecution = {

                    formatterName: formatter.name,
                    order,
                    changed: false,
                };

                try {
                    // Execute formatter

                    const beforeSource = context.currentSource;
                    const afterSource = await formatter.format(context.currentSource, filePath, this.config);
                    // Track changes

                    execution.changed = beforeSource !== afterSource;
                    context.currentSource = afterSource;

                    if (execution.changed) {

                        context.changed = true;
                    }
                    context.executions.push(execution);
                } catch (error) {
                    // Fail-fast: stop pipeline immediately on error

                    execution.error = error as Error;
                    context.executions.push(execution);

                    throw new FormatterError(formatter.name, filePath, error as Error);

                }
            }
        }
        // Write to disk if changes were made and not in dry-run mode

        if (context.changed && !dryRun) {

            await fs.writeFile(filePath, context.currentSource, "utf-8");
        }

        return context;
    }

    /**
     * Format multiple files in sequence
     * @param filePaths - Array of file paths to format
     * @param dryRun - If true, don't write changes to disk
     * @returns Array of pipeline contexts for each file
     * @throws FormatterError if any formatter fails for any file
     */
    async formatFiles(filePaths: string[], dryRun = false): Promise<PipelineContext[]> {

        const results: PipelineContext[] = [];

        for (const filePath of filePaths) {

            const context = await this.formatFile(filePath, dryRun);

            results.push(context);
        }

        return results;
    }

    /**
     * Format all files in a directory recursively
     * @param dirPath - Directory path to format
     * @param dryRun - If true, don't write changes to disk
     * @param extensions - File extensions to include (default: .ts, .tsx, .js, .jsx)
     * @returns Array of pipeline contexts for each file
     */
    async formatDirectory(dirPath: string, dryRun = false, extensions: string[] = [".ts", ".tsx", ".js", ".jsx"]): Promise<PipelineContext[]> {

        const files = await this.getFilesRecursively(dirPath, extensions);

        return this.formatFiles(files, dryRun);
    }

    /**
     * Get the list of formatters in execution order
     */
    getFormatterOrder(): FormatterOrder[] {

        return [...this.formatterOrder];
    }

    /**
     * Get all formatters at a specific order position
     */
    getFormattersAtOrder(order: FormatterOrder): IFormatter[] {

        return this.formatters.get(order) || [];
    }

    /**
     * Check if any formatters are configured
     */
    hasFormatters(): boolean {

        return this.formatters.size > 0;
    }

    /**
     * Initialize formatters based on configuration
     */
    private initializeFormatters(): void {
        // Code Style Formatter

        if (this.config.codeStyle?.enabled) {

            this.addFormatter(FormatterOrder.CodeStyle, new CodeStyleFormatter(this.config.codeStyle));
        }
        // Import Organizer

        if (this.config.imports?.enabled) {

            this.addFormatter(FormatterOrder.ImportOrganization, new ImportOrganizer(this.config.imports));
        }
        // AST Formatters

        if (this.config.sorting?.enabled) {
            // Class Member Formatter
            if (this.config.sorting.classMembers?.enabled) {

                this.addFormatter(FormatterOrder.ASTTransformation, new ClassMemberFormatter(this.config.sorting.classMembers));
            }
            // File Declaration Formatter

            if (this.config.sorting.fileDeclarations?.enabled) {

                this.addFormatter(FormatterOrder.ASTTransformation, new FileDeclarationFormatter(this.config.sorting.fileDeclarations));
            }
        }
        // Spacing Formatters

        if (this.config.spacing?.enabled) {

            this.addFormatter(FormatterOrder.Spacing, new BlankLineFormatter(this.config.spacing));
        }
    }
}
;
;
;
;
;
;

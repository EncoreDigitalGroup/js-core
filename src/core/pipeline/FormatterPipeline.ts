/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as fs from "fs/promises";
import * as path from "path";
import {CoreConfig, FormatterOrder} from "../../config/types";
import {IFormattingRule} from "../formatters/IFormattingRule";
import {ClassMemberSortingRule} from "../formatters/rules/ast/ClassMemberSortingRule";
import {FileDeclarationSortingRule} from "../formatters/rules/ast/FileDeclarationSortingRule";
import {ImportOrganizationRule} from "../formatters/rules/imports/ImportOrganizationRule";
import {IndexGenerationRule} from "../formatters/rules/index/IndexGenerationRule";
import {BlankLineBeforeReturnsRule} from "../formatters/rules/spacing/BlankLineBeforeReturnsRule";
import {BlankLineBetweenDeclarationsRule} from "../formatters/rules/spacing/BlankLineBetweenDeclarationsRule";
import {BlankLineBetweenStatementTypesRule} from "../formatters/rules/spacing/BlankLineBetweenStatementTypesRule";
import {BlockSpacingRule} from "../formatters/rules/spacing/BlockSpacingRule";
import {BracketSpacingRule} from "../formatters/rules/spacing/BracketSpacingRule";
import {IndentationRule} from "../formatters/rules/style/IndentationRule";
import {QuoteStyleRule} from "../formatters/rules/style/QuoteStyleRule";
import {SemicolonRule} from "../formatters/rules/style/SemicolonRule";


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
    private rules: Map<FormatterOrder, IFormattingRule[]> = new Map();

    constructor(private readonly config: CoreConfig) {
        this.formatterOrder = config.formatterOrder || [
            FormatterOrder.IndexGeneration,
            FormatterOrder.CodeStyle,
            FormatterOrder.ImportOrganization,
            FormatterOrder.ASTTransformation,
            FormatterOrder.Spacing,
        ];
        this.initializeRules();
    }

    /**
    * Add a rule to the pipeline at a specific order position
    */
    private addRule(order: FormatterOrder, rule: IFormattingRule): void {
        if (!this.rules.has(order)) {
            this.rules.set(order, []);
        }
        this.rules.get(order)!.push(rule);
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

        // Execute rules in order

        for (const order of this.formatterOrder) {
            const rulesAtOrder = this.rules.get(order);

            if (!rulesAtOrder || rulesAtOrder.length === 0) {
                continue;
            }

            for (const rule of rulesAtOrder) {
                const execution: FormatterExecution = {
                    formatterName: rule.name,
                    order,
                    changed: false,
};

                try {
                    // Execute rule

                    const beforeSource = context.currentSource;
                    const afterSource = rule.apply(context.currentSource, filePath);

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

                    throw new FormatterError(rule.name, filePath, error as Error);
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
    * Get all rules at a specific order position
    */
    getRulesAtOrder(order: FormatterOrder): IFormattingRule[] {
        return this.rules.get(order) || [];
    }

    /**
    * Check if any rules are configured
    */
    hasRules(): boolean {
        return this.rules.size > 0;
    }

    /**
    * Initialize rules based on configuration
    */
    private initializeRules(): void {
        // Index Generation Rule
        if (this.config.indexGeneration) {
            this.addRule(FormatterOrder.IndexGeneration, new IndexGenerationRule(this.config.indexGeneration));
        }

        // Code Style Rules

        if (this.config.codeStyle) {
            this.addRule(FormatterOrder.CodeStyle, new QuoteStyleRule(this.config.codeStyle));
            this.addRule(FormatterOrder.CodeStyle, new SemicolonRule(this.config.codeStyle));
            this.addRule(FormatterOrder.CodeStyle, new BracketSpacingRule(this.config.codeStyle));
            this.addRule(FormatterOrder.CodeStyle, new IndentationRule(this.config.codeStyle));
            this.addRule(FormatterOrder.CodeStyle, new BlockSpacingRule());
        }

        // Import Organization Rule

        if (this.config.imports) {
            this.addRule(FormatterOrder.ImportOrganization, new ImportOrganizationRule(this.config.imports));
        }

        // AST Transformation Rules

        if (this.config.sorting) {
            if (this.config.sorting.classMembers) {
                this.addRule(FormatterOrder.ASTTransformation, new ClassMemberSortingRule(this.config.sorting.classMembers));
            }

            if (this.config.sorting.fileDeclarations) {
                this.addRule(FormatterOrder.ASTTransformation, new FileDeclarationSortingRule(this.config.sorting.fileDeclarations));
            }
        }

        // Spacing Rules

        if (this.config.spacing) {
            this.addRule(FormatterOrder.Spacing, new BlankLineBetweenDeclarationsRule(this.config.spacing));
            this.addRule(FormatterOrder.Spacing, new BlankLineBetweenStatementTypesRule(this.config.spacing));
            this.addRule(FormatterOrder.Spacing, new BlankLineBeforeReturnsRule(this.config.spacing));
        }
    }
}



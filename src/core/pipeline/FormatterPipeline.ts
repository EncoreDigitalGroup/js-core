/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as fs from "fs/promises";
import * as path from "path";
import { CoreConfig, FormatterOrder } from "../config";
import { Container } from "../di";
import { IFormattingRule } from "../formatters";


/*
* Tracks the state of a single formatter execution
*/
export interface FormatterExecution {
    formatterName: string;
    order: FormatterOrder;
    changed: boolean;
    error?: Error;
}

/** Context object tracking the entire pipeline execution */
export interface PipelineContext {
    filePath: string;
    originalSource: string;
    currentSource: string;
    executions: FormatterExecution[];
    changed: boolean;
    dryRun: boolean;
}

/** Error thrown when a formatter fails during pipeline execution */
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

    constructor(
        private readonly config: CoreConfig,
        private readonly container: Container
    ) {
        this.formatterOrder = config.formatterOrder || [
            FormatterOrder.IndexGeneration,
            FormatterOrder.CodeStyle,
            FormatterOrder.ImportOrganization,
            FormatterOrder.ASTTransformation,
            FormatterOrder.Spacing,
        ];
        this.initializeRules();
    }

    private addRuleByName(ruleName: string, order: FormatterOrder): void {
        if (!this.rules.has(order)) {
            this.rules.set(order, []);
        }

        // Resolve the rule from the container by name
        const ruleInstance = this.container.resolve<IFormattingRule>(ruleName);

        // Add to the pipeline
        this.rules.get(order)!.push(ruleInstance);
    }

    /** Get all files in a directory recursively */
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

    /** Check if source code contains a tsfmt-ignore directive */
    private shouldIgnoreFile(source: string): boolean {
        // Check the first 1000 characters for the ignore directive
        // This covers file headers, copyright notices, and initial comments
        const header = source.slice(0, 1000);

        // Match tsfmt-ignore in various comment formats:
        // - // tsfmt-ignore (single-line comment)
        // - /* tsfmt-ignore */ (inline block comment)
        // - * tsfmt-ignore (inside multi-line block comment)
        // - tsfmt-ignore on its own line in a block comment
        return /(?:\/\/|\/\*|\*)\s*tsfmt-ignore|^\s*tsfmt-ignore\s*$/m.test(header);
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

        // Check for tsfmt-ignore directive
        if (this.shouldIgnoreFile(originalSource)) {
            return {
                filePath,
                originalSource,
                currentSource: originalSource,
                executions: [],
                changed: false,
                dryRun,
            };
        }

        // Skip React component files if configured
        if (this.config.skipReactFiles && /\.(tsx|jsx)$/.test(filePath)) {
            return {
                filePath,
                originalSource,
                currentSource: originalSource,
                executions: [],
                changed: false,
                dryRun,
            };
        }

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

    /** Get the list of formatters in execution order */
    getFormatterOrder(): FormatterOrder[] {
        return [...this.formatterOrder];
    }

    /** Get all rules at a specific order position */
    getRulesAtOrder(order: FormatterOrder): IFormattingRule[] {
        return this.rules.get(order) || [];
    }

    /** Check if any rules are configured */
    hasRules(): boolean {
        return this.rules.size > 0;
    }

    /** Initialize rules based on configuration using clean DI pattern */
    private initializeRules(): void {
        if (this.config.indexGeneration?.enabled) {
            this.addRuleByName("IndexGenerationRule", FormatterOrder.IndexGeneration);
        }

        if (this.config.codeStyle?.enabled) {
            this.addRuleByName("QuoteStyleRule", FormatterOrder.CodeStyle);
            this.addRuleByName("SemicolonRule", FormatterOrder.CodeStyle);
            this.addRuleByName("BracketSpacingRule", FormatterOrder.CodeStyle);
            this.addRuleByName("IndentationRule", FormatterOrder.CodeStyle);
            this.addRuleByName("StructuralIndentationRule", FormatterOrder.CodeStyle);
            this.addRuleByName("BlockSpacingRule", FormatterOrder.CodeStyle);
            this.addRuleByName("DocBlockCommentRule", FormatterOrder.CodeStyle);
        }

        if (this.config.imports?.enabled) {
            this.addRuleByName("ImportOrganizationRule", FormatterOrder.ImportOrganization);
        }

        if (this.config.sorting?.enabled) {
            if (this.config.sorting.classMembers?.enabled) {
                this.addRuleByName("ClassMemberSortingRule", FormatterOrder.ASTTransformation);
            }

            if (this.config.sorting.fileDeclarations?.enabled) {
                this.addRuleByName("FileDeclarationSortingRule", FormatterOrder.ASTTransformation);
            }
        }

        if (this.config.spacing?.enabled) {
            this.addRuleByName("BlankLineBetweenDeclarationsRule", FormatterOrder.Spacing);
            this.addRuleByName("BlankLineBetweenStatementTypesRule", FormatterOrder.Spacing);
            this.addRuleByName("BlankLineBeforeReturnsRule", FormatterOrder.Spacing);
        }
    }
}



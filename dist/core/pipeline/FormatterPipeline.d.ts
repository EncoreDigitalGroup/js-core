import { CoreConfig, FormatterOrder } from "../config";
import { Container } from "../di";
import { IFormattingRule } from "../formatters";
export interface FormatterExecution {
    formatterName: string;
    order: FormatterOrder;
    changed: boolean;
    error?: Error;
}
export interface PipelineContext {
    filePath: string;
    originalSource: string;
    currentSource: string;
    executions: FormatterExecution[];
    changed: boolean;
    dryRun: boolean;
}
export declare class FormatterError extends Error {
    readonly formatterName: string;
    readonly filePath: string;
    readonly originalError: Error;
    constructor(formatterName: string, filePath: string, originalError: Error);
}
export declare class FormatterPipeline {
    private readonly config;
    private readonly container;
    private formatterOrder;
    private rules;
    constructor(config: CoreConfig, container: Container);
    private extractTypeNameFromStack;
    private addRule;
    private addRuleByName;
    private getFilesRecursively;
    private shouldIgnoreFile;
    formatFile(filePath: string, dryRun?: boolean): Promise<PipelineContext>;
    formatFiles(filePaths: string[], dryRun?: boolean): Promise<PipelineContext[]>;
    formatDirectory(dirPath: string, dryRun?: boolean, extensions?: string[]): Promise<PipelineContext[]>;
    getFormatterOrder(): FormatterOrder[];
    getRulesAtOrder(order: FormatterOrder): IFormattingRule[];
    hasRules(): boolean;
    private initializeRules;
}

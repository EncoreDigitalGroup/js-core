import { BaseFormattingRule } from "../../BaseFormattingRule";
export interface IndexGenerationOptions {
    fileExtension: string;
    indexFileName: string;
    recursive: boolean;
}
export interface IndexGenerationConfig {
    enabled?: boolean;
    directories?: string[];
    options?: Partial<IndexGenerationOptions>;
    updateMainIndex?: boolean;
}
export declare class IndexGenerationRule extends BaseFormattingRule {
    private readonly defaultOptions;
    readonly name = "IndexGenerationRule";
    private findProjectRoot;
    private isTestDirectory;
    private isTestFile;
    private generateSingleDirectoryIndex;
    private generateIndexExportRecursive;
    private generateIndexExport;
    private discoverExportableModules;
    private updateMainIndex;
    private generateIndexFiles;
    apply(source: string, filePath?: string): string;
}

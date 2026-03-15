import * as ts from "typescript";
import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare enum DeclarationType {
    Interface = "interface",
    TypeAlias = "type_alias",
    Enum = "enum",
    HelperFunction = "helper_function",
    HelperVariable = "helper_variable",
    ExportedFunction = "exported_function",
    ExportedVariable = "exported_variable",
    ExportedClass = "exported_class",
    DefaultExport = "default_export",
    Other = "other"
}
export interface FileDeclaration {
    node: ts.Statement;
    type: DeclarationType;
    name: string;
    isExported: boolean;
    isDefaultExport: boolean;
    text: string;
    dependencies?: Set<string>;
    originalIndex?: number;
}
export declare const DEFAULT_FILE_ORDER: DeclarationType[];
export declare class FileDeclarationSortingRule extends BaseFormattingRule {
    readonly name = "FileDeclarationSortingRule";
    private getDeclarationType;
    private analyzeDeclaration;
    private createSourceFile;
    private sortFileDeclarations;
    apply(source: string, filePath?: string): string;
}

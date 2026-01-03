import * as ts from "typescript";
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
export interface FileSortConfig {
    order?: DeclarationType[];
    respectDependencies?: boolean;
}
export declare const DEFAULT_FILE_ORDER: DeclarationType[];
export declare function __sortFileDeclarations(declarations: FileDeclaration[], config?: FileSortConfig): FileDeclaration[];
export declare function __transformFile(sourceFile: ts.SourceFile, config?: FileSortConfig): ts.SourceFile;

import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class ImportOrganizationRule extends BaseFormattingRule {
    readonly name = "ImportOrganizationRule";
    private createSourceFile;
    private determineImportGroup;
    private extractImports;
    private getImportedIdentifiers;
    private isIdentifierUsed;
    private isImportUsed;
    private filterUnusedImports;
    private sortImports;
    private groupImports;
    private reconstructSource;
    apply(source: string, filePath?: string): string;
}

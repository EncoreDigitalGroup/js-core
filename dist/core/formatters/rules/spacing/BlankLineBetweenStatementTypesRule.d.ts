import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class BlankLineBetweenStatementTypesRule extends BaseFormattingRule {
    readonly name = "BlankLineBetweenStatementTypesRule";
    private getStatementType;
    apply(source: string, filePath?: string): string;
}

import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class BlankLineBetweenDeclarationsRule extends BaseFormattingRule {
    readonly name = "BlankLineBetweenDeclarationsRule";
    private getDeclarationKeyword;
    apply(source: string, filePath?: string): string;
}

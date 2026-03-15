import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class StructuralIndentationRule extends BaseFormattingRule {
    readonly name = "StructuralIndentationRule";
    private skipString;
    private isRegexStart;
    private skipRegex;
    private getLineIndentLevel;
    private startsWithClosingBracket;
    private findBracketFixes;
    apply(source: string, filePath?: string): string;
}

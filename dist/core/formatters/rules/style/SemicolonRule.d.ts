import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class SemicolonRule extends BaseFormattingRule {
    readonly name = "SemicolonRule";
    apply(source: string, filePath?: string): string;
}

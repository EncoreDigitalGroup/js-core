import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class IndentationRule extends BaseFormattingRule {
    readonly name = "IndentationRule";
    apply(source: string, filePath?: string): string;
}

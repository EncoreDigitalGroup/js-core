import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class QuoteStyleRule extends BaseFormattingRule {
    readonly name = "QuoteStyleRule";
    apply(source: string, filePath?: string): string;
}

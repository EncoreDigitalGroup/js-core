import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class BlankLineBeforeReturnsRule extends BaseFormattingRule {
    readonly name = "BlankLineBeforeReturnsRule";
    apply(source: string, filePath?: string): string;
}

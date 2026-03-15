import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class BracketSpacingRule extends BaseFormattingRule {
    readonly name = "BracketSpacingRule";
    apply(source: string, filePath?: string): string;
}

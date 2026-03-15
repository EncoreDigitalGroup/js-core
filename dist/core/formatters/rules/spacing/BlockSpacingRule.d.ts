import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class BlockSpacingRule extends BaseFormattingRule {
    readonly name = "BlockSpacingRule";
    apply(source: string, filePath?: string): string;
}

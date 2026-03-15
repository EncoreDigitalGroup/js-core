import { BaseFormattingRule } from "../../BaseFormattingRule";
export declare class DocBlockCommentRule extends BaseFormattingRule {
    readonly name = "DocBlockCommentRule";
    apply(source: string, filePath?: string): string;
}

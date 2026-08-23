/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";
import {overlapsProtectedRange} from "../../LineProtection";

/**
 * Consolidates single-line doc block comments into a single line
 * Transforms multi-line doc blocks that contain only one line of text
 */
export class DocBlockCommentRule extends BaseFormattingRule {
    readonly name = "DocBlockCommentRule";

    override applyToContext(context: FormatContext): void {
        const source = context.getText();
        const protectedRanges = context.getProtectedRanges();

        // Match doc block comments that span multiple lines but only have one content line
        const docBlockPattern = /\/\*\*\s*\n\s*\*\s*([^\n]*?)\s*\n\s*\*\//g;
        let result = "";
        let cursor = 0;
        let match: RegExpExecArray | null;
        while ((match = docBlockPattern.exec(source)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            const content = match[1];

            // Only consolidate if there's actual content, it's a single line, and the doc block doesn't
            // overlap a protected range (JSX text/expressions, template literals).
            if (!content || !content.trim() || overlapsProtectedRange(start, end, protectedRanges)) {
                continue;
            }

            result += source.slice(cursor, start) + `/** ${content.trim()} */`;
            cursor = end;
        }

        result += source.slice(cursor);

        if (result !== source) {
            context.sourceFile.replaceWithText(result);
        }
    }
}
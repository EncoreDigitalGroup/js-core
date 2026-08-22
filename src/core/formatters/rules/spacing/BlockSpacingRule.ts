/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";
import {overlapsProtectedRange, ProtectedRange} from "../../LineProtection";

/** A single non-overlapping text replacement, in source-text coordinates. */
interface BlockSpacingEdit {
    start: number;
    end: number;
    replacement: string;
}

/**
 * Removes excessive blank lines inside blocks (interfaces, classes, enums, functions)
 * - No blank line after opening brace
 * - JSDoc comments stick to what they describe (no blank line after)
 * - Single blank line between members/properties
 */
export class BlockSpacingRule extends BaseFormattingRule {
    readonly name = "BlockSpacingRule";

    /**
     * Finds every match of the three blank-line patterns against the original text and keeps the ones
     * that don't overlap a protected range (JSX text/expressions, template literals). The three patterns
     * are mutually exclusive by construction — each requires a different character immediately after the
     * blank run (a declaration start, a doc-comment close, or a closing brace) — so collecting them all
     * against the untouched source and applying them in a single pass reproduces the same result as the
     * original sequential `String.replace` chain, without needing to re-derive protected ranges after
     * each stage.
     */
    private collectEdits(source: string, protectedRanges: ProtectedRange[]): BlockSpacingEdit[] {
        const edits: BlockSpacingEdit[] = [];
        const patterns: Array<{ regex: RegExp; replace: (match: RegExpExecArray) => string }> = [
            // Remove blank lines after opening braces of interfaces, classes, enums, functions
            {regex: /\{\n\n+(\s*(?:\/\*\*|[a-zA-Z_]))/g, replace: match => `{\n${match[1]}`},
            // Remove blank lines between JSDoc comments and what they describe
            {regex: /(\*\/)\n\n+(\s+[a-zA-Z_])/g, replace: match => `${match[1]}\n${match[2]}`},
            // Remove blank lines before closing braces (keep just one newline)
            {regex: /\n\n+(\s*\})/g, replace: match => `\n${match[1]}`},
        ];

        for (const {regex, replace} of patterns) {
            regex.lastIndex = 0;

            let match: RegExpExecArray | null;
            while ((match = regex.exec(source)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (!overlapsProtectedRange(start, end, protectedRanges)) {
                    edits.push({start, end, replacement: replace(match)});
                }
            }
        }

        return edits;
    }

    override applyToContext(context: FormatContext): void {
        const source = context.getText();
        const protectedRanges = context.getProtectedRanges();
        const edits = this.collectEdits(source, protectedRanges).sort((a, b) => a.start - b.start);
        if (edits.length === 0) {
            return;
        }

        let result = "";
        let cursor = 0;

        for (const edit of edits) {
            result += source.slice(cursor, edit.start) + edit.replacement;
            cursor = edit.end;
        }

        result += source.slice(cursor);

        if (result !== source) {
            context.sourceFile.replaceWithText(result);
        }
    }
}
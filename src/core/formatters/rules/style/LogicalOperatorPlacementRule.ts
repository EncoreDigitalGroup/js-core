/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";
import {getProtectedLineIndices} from "../../LineProtection";

/**
 * Places logical operators (`&&`, `||`) at the beginning of continuation lines in
 * multi-line boolean expressions rather than trailing the previous line. A trailing
 * operator is stripped from its line and prepended to the next code line; blank lines
 * encountered while an operator is being carried (i.e. inside a wrapped condition) are
 * dropped so the wrapped expression stays contiguous.
 *
 * Example:
 *   if (a ||          ->   if (a
 *       b)                     || b)
 *
 * A wrapped condition is then collapsed back onto a single line when it is short enough,
 * judged by both the resulting line length and the number of operands. These thresholds are
 * internal tuning knobs for now; they are intended to become user configuration later.
 */
export class LogicalOperatorPlacementRule extends BaseFormattingRule {
    private static readonly MAX_INLINE_LENGTH = 120;

    // Internal tuning knobs (not user-configurable yet). A wrapped condition collapses to one
    // line only when it has at most this many operands AND the collapsed line fits this width —
    // condition count alone is the wrong measure, so length is weighed alongside it.
    private static readonly MAX_INLINE_OPERANDS = 2;
    readonly name = "LogicalOperatorPlacementRule";

    /**
     * Folds a line and its `&&`/`||`-leading continuation lines back onto one line when the group
     * is small enough by both knobs. All-or-nothing per group: an oversized group stays wrapped.
     */
    private collapseShortWrappedConditions(lines: string[]): string[] {
        const out: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const head = lines[i];
            const continuationsOriginal: string[] = [];
            const continuationsTrimmed: string[] = [];
            let j = i + 1;
            while (j < lines.length) {
                const trimmed = lines[j].trim();
                if (trimmed.startsWith("||") || trimmed.startsWith("&&")) {
                    continuationsOriginal.push(lines[j]);
                    continuationsTrimmed.push(trimmed);
                    j++;
                } else {
                    break;
                }
            }

            if (continuationsTrimmed.length === 0) {
                out.push(head);
                continue;
            }

            const collapsed = [head, ...continuationsTrimmed].join(" ");
            const operandCount = continuationsTrimmed.length + 1;
            if (operandCount <= LogicalOperatorPlacementRule.MAX_INLINE_OPERANDS
                && collapsed.length <= LogicalOperatorPlacementRule.MAX_INLINE_LENGTH) {
                out.push(collapsed);
            } else {
                out.push(head, ...continuationsOriginal);
            }

            // Skip the continuation lines already consumed by this group either way.
            i = j - 1;
        }

        return out;
    }

    override applyToContext(context: FormatContext): void {
        const source = context.getText();
        const protectedLines = getProtectedLineIndices(source, context.getProtectedRanges());
        const lines = source.split("\n");
        const result: string[] = [];

        // Operator carried from the previous line to the start of the next code line.
        let pending = "";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // A blank line inside a carried (wrapped) condition is dropped; otherwise kept.
            if (trimmed === "") {
                if (pending === "") {
                    result.push(line);
                }

                continue;
            }

            // Never rewrite JSX/template regions or comment lines — an operator glyph there is
            // content, not code layout.
            if (protectedLines.has(i) || trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                if (pending !== "") {
                    // Flush the carried operator onto its own line rather than losing it.
                    result.push(pending);
                    pending = "";
                }

                result.push(line);
                continue;
            }

            const leading = line.slice(0, line.length - line.trimStart().length);
            let content = line.slice(leading.length);

            if (pending !== "") {
                content = pending + " " + content;
                pending = "";
            }

            // Move a trailing `&&`/`||` down to the next line, but never one sitting in a line comment.
            if (!content.includes("//")) {
                const match = content.match(/(\|\||&&)$/);
                if (match) {
                    content = content.slice(0, content.length - match[0].length).replace(/\s+$/, "");
                    pending = match[1];
                }
            }

            result.push(leading + content);
        }

        // A dangling operator (no following code line) is reattached to the last emitted line.
        if (pending !== "") {
            if (result.length > 0) {
                result[result.length - 1] = result[result.length - 1] + " " + pending;
            } else {
                result.push(pending);
            }
        }

        const after = this.collapseShortWrappedConditions(result).join("\n");
        if (after !== source) {
            context.sourceFile.replaceWithText(after);
        }
    }
}

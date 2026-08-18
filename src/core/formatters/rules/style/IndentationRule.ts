/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";
import {getProtectedLineIndices} from "../../LineProtection";

/**
 * Normalizes indentation (tabs vs spaces, indent width)
 * Note: Uses line-by-line processing rather than AST for better preservation
 * of comments and whitespace
 */
export class IndentationRule extends BaseFormattingRule {
    readonly name = "IndentationRule";
    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config?.indentStyle || !config.indentWidth) {
            return;
        }

        const indentWidth = config.indentWidth;
        const source = context.getText();
        const protectedLines = getProtectedLineIndices(source, context.getProtectedRanges());

        // For indentation, we need to reprocess line by line
        // Note: While we could use AST for this, line-by-line processing
        // is more practical for indentation normalization as it preserves
        // comments and whitespace better
        const lines = source.split("\n");
        const result: string[] = [];

        // Track whether we are inside a multi-line block comment (`/* ... */`) and the indentation
        // applied to its opening line, so continuation lines align their `*` one space in from the
        // opening `/*` (standard JSDoc/block-comment alignment) instead of being floor-divided like code.
        let inBlockComment = false;
        let commentBaseIndent = "";

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            // Skip empty lines, and any line overlapping JSX text/expressions or template literals —
            // reindenting those would rewrite whitespace that is semantically significant there.
            if (line.trim() === "" || protectedLines.has(lineIndex)) {
                result.push(line);
                continue;
            }

            // Get the leading whitespace
            const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
            const content = line.substring(leadingWhitespace.length);

            // Continuation of a multi-line block comment: align each `*`-prefixed line one space in
            // from the opening `/*`. Non-`*` body lines (e.g. code samples) are left untouched.
            if (inBlockComment) {
                if (content.startsWith("*")) {
                    result.push(commentBaseIndent + " " + content);
                } else {
                    result.push(line);
                }

                if (content.includes("*/")) {
                    inBlockComment = false;
                }

                continue;
            }

            // Calculate indent level based on current whitespace
            let indentLevel = 0;

            if (config.indentStyle === "space") {
                // Count tabs and spaces
                const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
                const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
                indentLevel = tabCount + Math.floor(spaceCount / indentWidth);
            } else {
                // Converting to tabs
                const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
                const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
                indentLevel = tabCount + Math.floor(spaceCount / indentWidth);
            }

            // Create new indentation
            let newIndent: string;

            if (config.indentStyle === "space") {
                newIndent = " ".repeat(indentLevel * indentWidth);
            } else {
                newIndent = "\t".repeat(indentLevel);
            }

            // A line that opens a block comment without closing it on the same line starts a
            // continuation run; record its normalized indent so following `*` lines align to it.
            if (content.startsWith("/*") && !content.includes("*/")) {
                inBlockComment = true;
                commentBaseIndent = newIndent;
            }

            result.push(newIndent + content);
        }

        const after = result.join("\n");
        if (after !== source) {
            context.sourceFile.replaceWithText(after);
        }
    }
}

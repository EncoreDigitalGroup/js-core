/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CodeStyleConfig } from "../../../config";
import { IFormattingRule } from "../../IFormattingRule";


/**
* Normalizes indentation (tabs vs spaces, indent width)
* Note: Uses line-by-line processing rather than AST for better preservation
* of comments and whitespace
*/

export class IndentationRule implements IFormattingRule {
    readonly name = "IndentationRule";

    constructor(private config: CodeStyleConfig) {
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.indentStyle || !this.config.indentWidth) {
            return source;
        }

        const indentWidth = this.config.indentWidth;
        // For indentation, we need to reprocess line by line
        // Note: While we could use AST for this, line-by-line processing
        // is more practical for indentation normalization as it preserves
        // comments and whitespace better
        const lines = source.split("\n");
        const result: string[] = [];

        for (const line of lines) {
            // Skip empty lines

            if (line.trim() === "") {
                result.push(line);
                continue;
            }
            // Get the leading whitespace

            const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
            const content = line.substring(leadingWhitespace.length);
            // Calculate indent level based on current whitespace

            let indentLevel = 0;

            if (this.config.indentStyle === "space") {
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

            if (this.config.indentStyle === "space") {
                newIndent = " ".repeat(indentLevel * indentWidth);
            } else {
                newIndent = "\t".repeat(indentLevel);
            }
            result.push(newIndent + content);
        }

        return result.join("\n");
    }
}

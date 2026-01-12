/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { CodeStyleConfig } from "../../../../config/types";
import { IFormattingRule } from "../../IFormattingRule";


/**
* Converts quote style between single and double quotes using AST
*/

export class QuoteStyleRule implements IFormattingRule {
    readonly name = "QuoteStyleRule";

    constructor(private config: CodeStyleConfig) {
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.quoteStyle) {
            return source;
        }

        const sourceFile = ts.createSourceFile("temp.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        // Collect all string literals that need to be changed
        const changes: Array<{
            start: number;
            end: number;
            text: string;
        }> = [];

        const visit = (node: ts.Node) => {
            // Handle string literals (but not template literals)

            if (ts.isStringLiteral(node)) {
                const nodeText = node.getText(sourceFile);
                const currentQuote = nodeText[0];
                const desiredQuote = this.config.quoteStyle === "single" ? "'" : '"';
                // Only change if quotes are different

                if (currentQuote !== desiredQuote) {
                    // Get the string content (without quotes)

                    const content = node.text;
                    // Check if the new quote style would require escaping
                    const needsEscape = content.includes(desiredQuote);
                    // If it needs escaping, skip this string literal

                    if (!needsEscape) {
                        const newText = desiredQuote + content + desiredQuote;

                        changes.push({
                            start: node.getStart(sourceFile),
                            end: node.getEnd(),
                            text: newText,
});
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        // Apply changes from end to start to maintain correct positions
        changes.sort((a, b) => b.start - a.start);

        let result = source;

        for (const change of changes) {
            result = result.substring(0, change.start) + change.text + result.substring(change.end);
        }

        return result;
    }
}

/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/** Converts quote style between single and double quotes using AST */
export class QuoteStyleRule extends BaseFormattingRule {
    readonly name = "QuoteStyleRule";
    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config?.quoteStyle) {
            return;
        }

        const desiredQuote = config.quoteStyle === "single" ? "'" : "\"";
        const stringLiterals = context.sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
        for (const node of stringLiterals) {
            // Preserve JSX attribute quotes
            if (node.getParent()?.getKind() === SyntaxKind.JsxAttribute) {
                continue;
            }

            const nodeText = node.getText();
            const currentQuote = nodeText[0];

            // Only change if quotes are different
            if (currentQuote === desiredQuote) {
                continue;
            }

            // Get the string content (without quotes)
            const content = node.getLiteralText();

            // Check if the new quote style would require escaping; skip if so
            const needsEscape = content.includes(desiredQuote);
            if (needsEscape) {
                continue;
            }

            const newText = desiredQuote + content + desiredQuote;

            // Only change the quote characters — replaceWithText (not setLiteralValue, which
            // would re-run escaping) leaves everything else untouched.
            node.replaceWithText(newText);
        }
    }
}

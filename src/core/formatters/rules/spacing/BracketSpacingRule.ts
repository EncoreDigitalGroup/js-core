/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Node, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/**
 * Adds or removes spacing inside object literals and imports using the shared AST
 * Examples:
 * - bracketSpacing: true  -> { foo: bar }
 * - bracketSpacing: false -> {foo: bar}
 */
export class BracketSpacingRule extends BaseFormattingRule {
    readonly name = "BracketSpacingRule";
    private collectBraceSpacingChanges(
        node: Node,
        bracketSpacing: boolean,
        changes: Array<{ pos: number; type: "add" | "remove"; text?: string }>,
    ): void {
        const fullText = node.getSourceFile().getFullText();
        const openBraceEnd = node.getStart() + 1; // Position after '{'
        const closeBraceStart = node.getEnd() - 1; // Position of '}'

        if (bracketSpacing) {
            const afterOpenBrace = fullText[openBraceEnd];
            if (afterOpenBrace !== " " && afterOpenBrace !== "\n") {
                changes.push({pos: openBraceEnd, type: "add", text: " "});
            }

            const beforeCloseBrace = fullText[closeBraceStart - 1];
            if (beforeCloseBrace !== " " && beforeCloseBrace !== "\n") {
                changes.push({pos: closeBraceStart, type: "add", text: " "});
            }
        } else {
            let pos = openBraceEnd;
            while (fullText[pos] === " " || fullText[pos] === "\t") {
                changes.push({pos, type: "remove"});
                pos++;
            }

            pos = closeBraceStart - 1;

            while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "\t")) {
                changes.push({pos, type: "remove"});
                pos--;
            }
        }
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config || config.bracketSpacing === undefined) {
            return;
        }

        const changes: Array<{ pos: number; type: "add" | "remove"; text?: string }> = [];
        const visit = (node: Node) => {
            const kind = node.getKind();

            // Object literals — never treat a JSX expression container's braces as one.
            if (kind === SyntaxKind.ObjectLiteralExpression && node.getParent()?.getKind() !== SyntaxKind.JsxExpression) {
                const objectLiteral = node.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
                if (objectLiteral.getProperties().length > 0) {
                    this.collectBraceSpacingChanges(objectLiteral, config.bracketSpacing!, changes);
                }
            }

            // Named imports
            if (kind === SyntaxKind.NamedImports && node.getParent()?.getKind() === SyntaxKind.ImportClause) {
                const namedImports = node.asKindOrThrow(SyntaxKind.NamedImports);
                if (namedImports.getElements().length > 0) {
                    this.collectBraceSpacingChanges(namedImports, config.bracketSpacing!, changes);
                }
            }

            node.forEachChild(visit);
        };

        visit(context.sourceFile);

        // Apply changes from end to start so earlier positions stay valid.
        changes.sort((a, b) => b.pos - a.pos);

        for (const change of changes) {
            if (change.type === "add") {
                context.sourceFile.insertText(change.pos, change.text ?? " ");
            } else {
                context.sourceFile.removeText(change.pos, change.pos + 1);
            }
        }
    }
}
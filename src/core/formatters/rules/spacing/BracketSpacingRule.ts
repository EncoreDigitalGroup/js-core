/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Node, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/**
 * Adds or removes spacing inside object literals, named imports, and object type literals using the
 * shared AST. Value objects and type literals carry independent settings.
 * Examples:
 * - bracketSpacing: true  -> { foo: bar }
 * - bracketSpacing: false -> {foo: bar}
 * - typeBracketSpacing: true  -> { foo: string }
 * - typeBracketSpacing: false -> {foo: string}
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
            // Remove inner padding only for a single-line brace pair. When the run of spaces/tabs
            // is bounded by a newline, the brace sits on its own line and those spaces are the
            // line's indentation — never delete it, or a multi-line closing brace collapses to
            // column 0 (and inside a protected JSX range, nothing repairs it afterwards).
            let pos = openBraceEnd;
            const openRemovals: number[] = [];

            while (fullText[pos] === " " || fullText[pos] === "\t") {
                openRemovals.push(pos);
                pos++;
            }

            if (fullText[pos] !== "\n") {
                for (const p of openRemovals) {
                    changes.push({pos: p, type: "remove"});
                }
            }

            pos = closeBraceStart - 1;

            const closeRemovals: number[] = [];

            while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "\t")) {
                closeRemovals.push(pos);
                pos--;
            }

            if (fullText[pos] !== "\n") {
                for (const p of closeRemovals) {
                    changes.push({pos: p, type: "remove"});
                }
            }
        }
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config || (config.bracketSpacing === undefined && config.typeBracketSpacing === undefined)) {
            return;
        }

        const changes: Array<{ pos: number; type: "add" | "remove"; text?: string }> = [];
        const visit = (node: Node) => {
            const kind = node.getKind();

            // Object literals — never treat a JSX expression container's braces as one.
            if (config.bracketSpacing !== undefined
                && kind === SyntaxKind.ObjectLiteralExpression && node.getParent()?.getKind() !== SyntaxKind.JsxExpression) {
                const objectLiteral = node.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
                if (objectLiteral.getProperties().length > 0) {
                    this.collectBraceSpacingChanges(objectLiteral, config.bracketSpacing, changes);
                }
            }

            // Named imports
            if (config.bracketSpacing !== undefined
                && kind === SyntaxKind.NamedImports && node.getParent()?.getKind() === SyntaxKind.ImportClause) {
                const namedImports = node.asKindOrThrow(SyntaxKind.NamedImports);
                if (namedImports.getElements().length > 0) {
                    this.collectBraceSpacingChanges(namedImports, config.bracketSpacing, changes);
                }
            }

            // Object type literals (`{ kind: "group"; label: string }`) carry their own setting,
            // distinct from value-object bracket spacing, so a codebase can keep objects tight while
            // spacing type members.
            if (config.typeBracketSpacing !== undefined && kind === SyntaxKind.TypeLiteral) {
                const typeLiteral = node.asKindOrThrow(SyntaxKind.TypeLiteral);
                if (typeLiteral.getMembers().length > 0) {
                    this.collectBraceSpacingChanges(typeLiteral, config.typeBracketSpacing, changes);
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
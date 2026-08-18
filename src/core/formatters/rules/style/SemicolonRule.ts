/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Node, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

// Declarations that end in a closing brace and must never carry a trailing semicolon.
const BRACE_DECLARATION_KINDS = new Set<SyntaxKind>([
    SyntaxKind.InterfaceDeclaration,
    SyntaxKind.ClassDeclaration,
    SyntaxKind.EnumDeclaration,
]);

/** Adds or removes semicolons based on configuration using the shared AST */
const STATEMENT_KINDS = new Set<SyntaxKind>([
    SyntaxKind.VariableStatement,
    SyntaxKind.ExpressionStatement,
    SyntaxKind.ReturnStatement,
    SyntaxKind.ThrowStatement,
    SyntaxKind.BreakStatement,
    SyntaxKind.ContinueStatement,
    SyntaxKind.ImportDeclaration,
    SyntaxKind.ExportDeclaration,
    SyntaxKind.TypeAliasDeclaration,
]);

export class SemicolonRule extends BaseFormattingRule {
    readonly name = "SemicolonRule";
    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config?.semicolons) {
            return;
        }

        const changes: Array<{ pos: number; type: "add" | "remove" }> = [];
        const fullText = context.sourceFile.getFullText();
        const visit = (node: Node) => {
            const kind = node.getKind();
            if (STATEMENT_KINDS.has(kind)) {
                const nodeEnd = node.getEnd();
                const hasSemicolon = fullText[nodeEnd - 1] === ";";
                if (config.semicolons === "always" && !hasSemicolon) {
                    changes.push({pos: nodeEnd, type: "add"});
                } else if (config.semicolons === "never" && hasSemicolon) {
                    changes.push({pos: nodeEnd - 1, type: "remove"});
                }
            }

            // Remove incorrect semicolons from interfaces, classes, and enums
            if (BRACE_DECLARATION_KINDS.has(kind)) {
                const nodeEnd = node.getEnd();
                const hasSemicolon = fullText[nodeEnd] === ";";
                if (hasSemicolon) {
                    changes.push({pos: nodeEnd, type: "remove"});
                }
            }

            node.forEachChild(visit);
        };

        visit(context.sourceFile);

        // Apply changes from end to start so earlier positions stay valid.
        changes.sort((a, b) => b.pos - a.pos);

        for (const change of changes) {
            if (change.type === "add") {
                context.sourceFile.insertText(change.pos, ";");
            } else {
                context.sourceFile.removeText(change.pos, change.pos + 1);
            }
        }
    }
}

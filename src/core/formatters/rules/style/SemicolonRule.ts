/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { CodeStyleConfig } from "../../../../config/types";
import { IFormattingRule } from "../../IFormattingRule";


/**
* Adds or removes semicolons based on configuration using AST
*/

export class SemicolonRule implements IFormattingRule {
    readonly name = "SemicolonRule";

    constructor(private config: CodeStyleConfig) {
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.semicolons) {
            return source;
        }

        const sourceFile = ts.createSourceFile("temp.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const changes: Array<{
            pos: number;
            type: "add" | "remove";
        }> = [];

        const visit = (node: ts.Node) => {
            // Check statements that should have semicolons
            // NOTE: Interfaces, classes, and enums should NOT have semicolons after their closing braces

            if (ts.isVariableStatement(node) ||

                ts.isExpressionStatement(node) ||
                ts.isReturnStatement(node) ||
                ts.isThrowStatement(node) ||
                ts.isBreakStatement(node) ||
                ts.isContinueStatement(node) ||
                ts.isImportDeclaration(node) ||
                ts.isExportDeclaration(node) ||
                ts.isTypeAliasDeclaration(node)) {
                const nodeEnd = node.getEnd();
                const fullText = sourceFile.getFullText();
                const hasSemicolon = fullText[nodeEnd - 1] === ";";

                if (this.config.semicolons === "always" && !hasSemicolon) {
                    // Add semicolon

                    changes.push({pos: nodeEnd, type: "add"});
                } else if (this.config.semicolons === "never" && hasSemicolon) {
                    // Remove semicolon

                    changes.push({pos: nodeEnd - 1, type: "remove"});
                }
            }

            // Remove incorrect semicolons from interfaces, classes, and enums

            if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
                const nodeEnd = node.getEnd();
                const fullText = sourceFile.getFullText();
                const hasSemicolon = fullText[nodeEnd] === ";";

                if (hasSemicolon) {
                    // Remove the incorrect semicolon after the closing brace

                    changes.push({pos: nodeEnd, type: "remove"});
                }
            }

            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        // Apply changes from end to start to maintain correct positions
        changes.sort((a, b) => b.pos - a.pos);

        let result = source;

        for (const change of changes) {
            if (change.type === "add") {
                result = result.substring(0, change.pos) + ";" + result.substring(change.pos);
            } else {
                result = result.substring(0, change.pos) + result.substring(change.pos + 1);
            }
        }

        return result;
    }
}

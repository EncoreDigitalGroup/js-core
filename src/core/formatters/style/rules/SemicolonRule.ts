/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { CodeStyleConfig } from "../../../../config/types";
import { IStyleRule } from "../IStyleRule";
/**
* Adds or removes semicolons based on configuration using AST
*/

export class SemicolonRule implements IStyleRule {

    readonly name = "SemicolonRule";
    constructor(private config: CodeStyleConfig) { }
    apply(source: string): string {

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

            if (ts.isVariableStatement(node) ||

                ts.isExpressionStatement(node) ||
                ts.isReturnStatement(node) ||
                ts.isThrowStatement(node) ||
                ts.isBreakStatement(node) ||
                ts.isContinueStatement(node) ||
                ts.isImportDeclaration(node) ||
                ts.isExportDeclaration(node) ||
                ts.isTypeAliasDeclaration(node) ||
                ts.isInterfaceDeclaration(node)) {

                const nodeEnd = node.getEnd();
                const fullText = sourceFile.getFullText();
                const hasSemicolon = fullText[nodeEnd - 1] === ";";

                if (this.config.semicolons === "always" && !hasSemicolon) {
                    // Add semicolon

                    changes.push({ pos: nodeEnd, type: "add" });
                }

                else if (this.config.semicolons === "never" && hasSemicolon) {
                    // Remove semicolon

                    changes.push({ pos: nodeEnd - 1, type: "remove" });
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
            }

            else {

                result = result.substring(0, change.pos) + result.substring(change.pos + 1);
            }
        }

        return result;
    }
}

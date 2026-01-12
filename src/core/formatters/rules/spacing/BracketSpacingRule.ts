/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

import * as ts from "typescript";
import {CodeStyleConfig} from "../../../../config/types";
import {IFormattingRule} from "../../IFormattingRule";


/**
* Adds or removes spacing inside object literals and imports using AST
* Examples:
* - bracketSpacing: true  -> { foo: bar }
* - bracketSpacing: false -> {foo: bar}
*/

export class BracketSpacingRule implements IFormattingRule {
    readonly name = "BracketSpacingRule";

    constructor(private config: CodeStyleConfig) {
    }

    apply(source: string, filePath?: string): string {
        if (this.config.bracketSpacing === undefined) {
            return source;
        }

        const sourceFile = ts.createSourceFile("temp.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const changes: Array<{
            pos: number;
            type: "add" | "remove";
            text?: string;
        }> = [];

        const fullText = sourceFile.getFullText();
        const visit = (node: ts.Node) => {
            // Handle object literals

            if (ts.isObjectLiteralExpression(node)) {
                const openBraceEnd = node.getStart(sourceFile) + 1; // Position after '{'
                const closeBraceStart = node.getEnd() - 1; // Position of '}'

                if (node.properties.length > 0) {
                    if (this.config.bracketSpacing) {
                        // Add spacing after opening brace

                        const afterOpenBrace = fullText[openBraceEnd];

                        if (afterOpenBrace !== " " && afterOpenBrace !== "\n") {
                            changes.push({pos: openBraceEnd, type: "add", text: " "});
                        }
                        // Add spacing before closing brace

                        const beforeCloseBrace = fullText[closeBraceStart - 1];

                        if (beforeCloseBrace !== " " && beforeCloseBrace !== "\n") {
                            changes.push({pos: closeBraceStart, type: "add", text: " "});
                        }
                    } else {
                        // Remove spacing after opening brace

                        let pos = openBraceEnd;

                        while (fullText[pos] === " " || fullText[pos] === "\t") {
                            changes.push({pos, type: "remove"});
                            pos++;
                        }
                        // Remove spacing before closing brace
                        pos = closeBraceStart - 1;

                        while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "\t")) {
                            changes.push({pos, type: "remove"});
                            pos--;
                        }
                    }
                }
            }
            // Handle named imports

            if (ts.isNamedImports(node)) {
                const parent = node.parent;

                if (parent && ts.isImportClause(parent)) {
                    const openBraceEnd = node.getStart(sourceFile) + 1;
                    const closeBraceStart = node.getEnd() - 1;

                    if (node.elements.length > 0) {
                        if (this.config.bracketSpacing) {
                            // Add spacing after opening brace

                            const afterOpenBrace = fullText[openBraceEnd];

                            if (afterOpenBrace !== " ") {
                                changes.push({pos: openBraceEnd, type: "add", text: " "});
                            }
                            // Add spacing before closing brace

                            const beforeCloseBrace = fullText[closeBraceStart - 1];

                            if (beforeCloseBrace !== " ") {
                                changes.push({pos: closeBraceStart, type: "add", text: " "});
                            }
                        } else {
                            // Remove spacing after opening brace

                            let pos = openBraceEnd;

                            while (fullText[pos] === " " || fullText[pos] === "\t") {
                                changes.push({pos, type: "remove"});
                                pos++;
                            }
                            // Remove spacing before closing brace
                            pos = closeBraceStart - 1;

                            while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "\t")) {
                                changes.push({pos, type: "remove"});
                                pos--;
                            }
                        }
                    }
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
                result = result.substring(0, change.pos) + (change.text || " ") + result.substring(change.pos);
            } else {
                result = result.substring(0, change.pos) + result.substring(change.pos + 1);
            }
        }

        return result;
    }
}

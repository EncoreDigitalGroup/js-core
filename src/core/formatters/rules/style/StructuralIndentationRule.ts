/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { BaseFormattingRule } from "../../BaseFormattingRule";


/**
* Fixes structural indentation issues where closing braces/brackets
* are not properly aligned with their opening statements.
*
* This rule ensures that closing braces (}, ]), and parentheses ())
* are indented to match the indentation level of their opening line,
* not pushed to column 0 or other incorrect positions.
*/
export class StructuralIndentationRule extends BaseFormattingRule {
readonly name = "StructuralIndentationRule";

private getLineIndentLevel(line: string, indentWidth: number, indentChar: string): number {
        const leadingWhitespace = line.match(/^[\t ]*/)?.[0] || "";

        if (indentChar === "\t") {
            return (leadingWhitespace.match(/\t/g) || []).length;
        }

        const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
        const spaceCount = (leadingWhitespace.match(/ /g) || []).length;

        return tabCount + Math.floor(spaceCount / indentWidth);
}

private isBlockLikeNode(node: ts.Node): boolean {
        return ts.isBlock(node) ||
            ts.isObjectLiteralExpression(node) ||
            ts.isArrayLiteralExpression(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isModuleDeclaration(node) ||
            ts.isModuleBlock(node) ||
            ts.isEnumDeclaration(node) ||
            ts.isTypeLiteralNode(node) ||
            ts.isCaseBlock(node) ||
            ts.isIfStatement(node) ||
            ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isWhileStatement(node) ||
            ts.isDoStatement(node) ||
            ts.isTryStatement(node) ||
            ts.isCatchClause(node);
}

private checkNodeBrackets(
        node: ts.Node,
        sourceFile: ts.SourceFile,
        lines: string[],
        fixes: Map<number, number>,
        indentWidth: number,
        indentChar: string
    ): void {
        const nodeStart = node.getStart(sourceFile);
        const nodeEnd = node.getEnd();
        const startPos = sourceFile.getLineAndCharacterOfPosition(nodeStart);
        const endPos = sourceFile.getLineAndCharacterOfPosition(nodeEnd);

        if (startPos.line === endPos.line) {
            return;
        }

        const startLine = lines[startPos.line];
        const endLine = lines[endPos.line];
        const startIndent = this.getLineIndentLevel(startLine, indentWidth, indentChar);
        const endLineContent = endLine.trimStart();

        const isClosingBracketLine = /^[}\])]/.test(endLineContent) ||
            /^[}\])][;,]?\s*$/.test(endLineContent) ||
            /^[}\])]\s*[;,]?\s*(\/\/.*)?$/.test(endLineContent);

        if (!isClosingBracketLine) {
            return;
        }

        if (this.isBlockLikeNode(node)) {
            const currentEndIndent = this.getLineIndentLevel(endLine, indentWidth, indentChar);

            if (currentEndIndent !== startIndent) {
                const existingFix = fixes.get(endPos.line);

                if (existingFix === undefined || startIndent > existingFix) {
                    fixes.set(endPos.line, startIndent);
                }
            }
        }
    }

private analyzeBracketStructure(
        sourceFile: ts.SourceFile,
        lines: string[],
        bracketStack: Array<{ char: string; line: number; indent: number }>,
        fixes: Map<number, number>,
        indentWidth: number,
        indentChar: string
    ): void {
        const visit = (node: ts.Node): void => {
            this.checkNodeBrackets(node, sourceFile, lines, fixes, indentWidth, indentChar);
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
    }

private getScriptKind(filePath?: string): ts.ScriptKind {
        if (!filePath) {
            return ts.ScriptKind.TS;
        }

        if (filePath.endsWith(".tsx")) {
            return ts.ScriptKind.TSX;
        }

        if (filePath.endsWith(".jsx")) {
            return ts.ScriptKind.JSX;
        }

        if (filePath.endsWith(".js")) {
            return ts.ScriptKind.JS;
        }

        return ts.ScriptKind.TS;
}

apply(source: string, filePath?: string): string {
        const config = this.getCodeStyleConfig();
        if (!config?.indentStyle || !config.indentWidth) {
            return source;
        }

        const indentWidth = config.indentWidth;
        const indentChar = config.indentStyle === "tab" ? "\t" : " ";
        const indentUnit = config.indentStyle === "tab" ? "\t" : " ".repeat(indentWidth);

        const sourceFile = ts.createSourceFile(
            filePath || "temp.ts",
            source,
            ts.ScriptTarget.Latest,
            true,
            this.getScriptKind(filePath)
        );

        const lines = source.split("\n");
        const bracketStack: Array<{ char: string; line: number; indent: number }> = [];
        const fixes: Map<number, number> = new Map();

        this.analyzeBracketStructure(sourceFile, lines, bracketStack, fixes, indentWidth, indentChar);

        if (fixes.size === 0) {
            return source;
        }

        const result: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (fixes.has(i)) {
                const targetIndent = fixes.get(i)!;
                const trimmedLine = lines[i].trimStart();
                const newIndent = indentUnit.repeat(targetIndent);
                result.push(newIndent + trimmedLine);
            } else {
                result.push(lines[i]);
            }
        }

        return result.join("\n");
}
}

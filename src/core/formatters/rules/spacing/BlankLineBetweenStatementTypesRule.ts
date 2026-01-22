/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import {BaseFormattingRule} from "../../BaseFormattingRule";


/** Statement types for categorization */
enum StatementType {
    Declaration = "declaration",// const, let, var, function, class, etc.
    Control = "control",// if, else, switch, case
    Loop = "loop",// for, while, do
    Exception = "exception",// try, catch, finally, throw
    Expression = "expression",// Expressions and calls
    Other = "other"
}

/**
 * Adds blank lines when switching between different statement types
 * Examples:
 * - Blank line between declarations and control flow
 * - Blank line between loops and expressions
 * - No blank line within the same statement type
 */

export class BlankLineBetweenStatementTypesRule extends BaseFormattingRule {
    readonly name = "BlankLineBetweenStatementTypesRule";

    /** Determine the type of a statement */
    private getStatementType(trimmedLine: string): StatementType {
        // Control flow
        if (trimmedLine.startsWith("if ") ||

            trimmedLine.startsWith("if(") ||
            trimmedLine.startsWith("else ") ||
            trimmedLine.startsWith("else{") ||
            trimmedLine.startsWith("switch ") ||
            trimmedLine.startsWith("switch(") ||
            trimmedLine.startsWith("case ") ||
            trimmedLine.startsWith("default:")) {
            return StatementType.Control;
        }
        // Loops
        if (trimmedLine.startsWith("for ") ||

            trimmedLine.startsWith("for(") ||
            trimmedLine.startsWith("while ") ||
            trimmedLine.startsWith("while(") ||
            trimmedLine.startsWith("do ") ||
            trimmedLine.startsWith("do{")) {
            return StatementType.Loop;
        }
        // Exceptions
        if (trimmedLine.startsWith("try ") ||

            trimmedLine.startsWith("try{") ||
            trimmedLine.startsWith("catch ") ||
            trimmedLine.startsWith("catch(") ||
            trimmedLine.startsWith("finally ") ||
            trimmedLine.startsWith("finally{") ||
            trimmedLine.startsWith("throw ")) {
            return StatementType.Exception;
        }
        // Declarations
        if (trimmedLine.startsWith("const ") ||

            trimmedLine.startsWith("let ") ||
            trimmedLine.startsWith("var ") ||
            trimmedLine.startsWith("function ") ||
            trimmedLine.startsWith("class ") ||
            trimmedLine.startsWith("interface ") ||
            trimmedLine.startsWith("type ") ||
            trimmedLine.startsWith("enum ") ||
            trimmedLine.startsWith("export ")) {
            return StatementType.Declaration;
        }
        // Everything else (expressions, calls, etc.)
        return StatementType.Expression;
    }

    apply(source: string, filePath?: string): string {
        const config = this.getSpacingConfig();
        if (!config?.betweenStatementTypes) {
            return source;
        }

        const lines = source.split("\n");
        const result: string[] = [];

        let lastStatementType: StatementType | null = null;
        let inImportSection = true;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const isBlankLine = trimmedLine === "";
            const isComment = trimmedLine.startsWith("//") ||

                trimmedLine.startsWith("/*") ||
                trimmedLine.startsWith("*");

            const isImport = trimmedLine.startsWith("import ");
            // Check if we've left the import section
            if (inImportSection && !isImport && !isBlankLine && !isComment) {
                inImportSection = false;
            }
            // Skip import section
            if (inImportSection || isBlankLine || isComment) {
                result.push(line);
                continue;
            }
            // Get statement type for non-blank, non-comment lines
            const currentStatementType = this.getStatementType(trimmedLine);
            // Add blank line if statement type changed
            if (lastStatementType !== null &&

                lastStatementType !== currentStatementType &&
                result.length > 0 &&
                result[result.length - 1].trim() !== "") {
                result.push("");
            }
            result.push(line);
            lastStatementType = currentStatementType;
        }

        return result.join("\n");
    }
}

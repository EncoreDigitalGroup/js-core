/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { SpacingConfig } from "../../../config";
import { IFormattingRule } from "../../IFormattingRule";


/**
* Adds blank lines between declarations with different keywords
* KEY ENHANCEMENT: Works at ALL brace depths (not just top level)
*
* Examples:
* - No blank line between consecutive "const" declarations
* - No blank line between consecutive "export" statements
* - Blank line when keyword changes (const → let, export → const, etc.)
*/

export class BlankLineBetweenDeclarationsRule implements IFormattingRule {
    readonly name = "BlankLineBetweenDeclarationsRule";

    constructor(private config: SpacingConfig) {
    }

    /** Extracts the keyword from a declaration line */
    private getDeclarationKeyword(trimmedLine: string): string | null {
        if (trimmedLine.startsWith("export ")) {
            return "export";
        }

        if (trimmedLine.startsWith("function ")) {
            return "function";
        }

        if (trimmedLine.startsWith("const ")) {
            return "const";
        }

        if (trimmedLine.startsWith("let ")) {
            return "let";
        }

        if (trimmedLine.startsWith("var ")) {
            return "var";
        }

        if (trimmedLine.startsWith("enum ")) {
            return "enum";
        }

        if (trimmedLine.startsWith("interface ")) {
            return "interface";
        }

        if (trimmedLine.startsWith("type ")) {
            return "type";
        }

        if (trimmedLine.startsWith("class ")) {
            return "class";
        }

        return null;
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.betweenDeclarations) {
            return source;
        }

        const lines = source.split("\n");
        const result: string[] = [];

        let braceDepth = 0;
        let inImportSection = true;
        let lastNonBlankLineWasDeclarationEnd = false;
        let lastDeclarationKeyword: string | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            // Track brace depth
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            const isBlankLine = trimmedLine === "";
            const isComment = trimmedLine.startsWith("//") ||

                trimmedLine.startsWith("/*") ||
                trimmedLine.startsWith("*") ||
                trimmedLine === "*/";

            const isBlockCommentStart = trimmedLine.startsWith("/*") && !trimmedLine.endsWith("*/");
            const isImport = trimmedLine.startsWith("import ");
            const declarationKeyword = !isComment && !isImport

                ? this.getDeclarationKeyword(trimmedLine)
                : null;

            const isDeclarationStart = declarationKeyword !== null;
            // Check if we've left the import section

            if (inImportSection && !isImport && !isBlankLine && !isComment) {
                inImportSection = false;
            }
            // KEY ENHANCEMENT: Removed "braceDepth === 0" check
            // Now works at ALL depths, not just top level

            if (!inImportSection) {
                // Add blank line before block comments that precede declarations
                if (isBlockCommentStart &&

                    lastNonBlankLineWasDeclarationEnd &&
                    result.length > 0 &&
                    result[result.length - 1].trim() !== "") {
                    result.push("");
                    lastNonBlankLineWasDeclarationEnd = false;
                }
                // Add blank line before declaration starts ONLY if the keyword is different

                else if (isDeclarationStart &&

                    lastNonBlankLineWasDeclarationEnd &&
                    result.length > 0 &&
                    result[result.length - 1].trim() !== "" &&
                    declarationKeyword !== lastDeclarationKeyword) {
                    result.push("");
                    lastNonBlankLineWasDeclarationEnd = false;
                }
            }
            result.push(line);
            // Track declaration ends BEFORE updating brace depth

            const hasClosingElement = trimmedLine === "}" ||

                trimmedLine.endsWith("}") ||
                trimmedLine.endsWith(";");

            const isJustClosingBraces = /^[\s});]*$/.test(trimmedLine);

            if (!isBlankLine && hasClosingElement) {
                lastNonBlankLineWasDeclarationEnd = true;
                // Update the last declaration keyword when a declaration ends

                if (isDeclarationStart) {
                    lastDeclarationKeyword = declarationKeyword;
                }
            } else if (!isBlankLine && !isComment) {
                // Don't reset if the line is just closing braces

                if (!isBlockCommentStart && trimmedLine !== "" && !isJustClosingBraces) {
                    lastNonBlankLineWasDeclarationEnd = isDeclarationStart;

                    if (isDeclarationStart) {
                        lastDeclarationKeyword = declarationKeyword;
                    }
                }
            }
            // Update brace depth (clamp to 0 if it goes negative)
            braceDepth += openBraces - closeBraces;

            if (braceDepth < 0) {
                braceDepth = 0;
            }
        }

        return result.join("\n");
    }
}

/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { BaseFormattingRule } from "../../BaseFormattingRule";


/** A fix to apply to a closing bracket */
interface BracketFix {
    position: number;
    line: number;
    column: number;
    targetIndent: number;
}

/** Information about an opening bracket */
interface BracketInfo {
    char: string;
    position: number;
    line: number;
    lineIndent: number;
}

/**
* Fixes structural indentation issues where closing braces/brackets
* are not properly aligned with their opening statements.
*
* Uses a stack-based approach to properly match opening and closing
* brackets, ensuring each closing bracket is indented to match its
* corresponding opening bracket's line indentation.
*/
export class StructuralIndentationRule extends BaseFormattingRule {
readonly name = "StructuralIndentationRule";

private skipString(source: string, start: number, quote: string): { pos: number; newlines: number } {
        let i = start + 1;
        let newlines = 0;
        const isTemplate = quote === "`";

        while (i < source.length) {
            const char = source[i];

            // Count newlines
            if (char === "\n") {
                newlines++;
                i++;
                continue;
            }

            // Handle escape sequences
            if (char === "\\") {
                i += 2;
                continue;
            }

            // Handle template literal expressions ${...}
            if (isTemplate && char === "$" && source[i + 1] === "{") {
                i += 2;
                let braceCount = 1;
                while (i < source.length && braceCount > 0) {
                    if (source[i] === "\n") {
                        newlines++;
                    } else if (source[i] === "{") {
                        braceCount++;
                    } else if (source[i] === "}") {
                        braceCount--;
                    } else if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
                        const result = this.skipString(source, i, source[i]);
                        i = result.pos;
                        newlines += result.newlines;
                        continue;
                    }
                    i++;
                }
                continue;
            }

            // End of string
            if (char === quote) {
                return {pos: i + 1, newlines};
            }

            i++;
        }

        return {pos: i, newlines};
}

private isRegexStart(source: string, index: number): boolean {
        // Look backwards to determine if this / starts a regex
        let i = index - 1;
        while (i >= 0 && (source[i] === " " || source[i] === "\t")) {
            i--;
        }

        if (i < 0) return true;

        const char = source[i];
        // After these characters, / is likely a regex
        const regexPreceders = ["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "\n", "return", "case"];

        if (regexPreceders.includes(char)) {
            return true;
        }

        // Check for keywords
        const keywords = ["return", "case", "typeof", "void", "delete", "throw", "in", "instanceof"];
        for (const kw of keywords) {
            if (index >= kw.length && source.substring(index - kw.length, index).endsWith(kw)) {
                return true;
            }
        }

        return false;
}

private skipRegex(source: string, start: number): number {
        let i = start + 1;
        let inCharClass = false;

        while (i < source.length) {
            const char = source[i];

            if (char === "\\") {
                i += 2;
                continue;
            }

            if (char === "[") {
                inCharClass = true;
            } else if (char === "]") {
                inCharClass = false;
            } else if (char === "/" && !inCharClass) {
                // Skip flags
                i++;
                while (i < source.length && /[gimsuy]/.test(source[i])) {
                    i++;
                }
                return i;
            } else if (char === "\n") {
                // Regex can't span lines without escaping
                return i;
            }

            i++;
        }

        return i;
}

private getLineIndentLevel(line: string, indentWidth: number): number {
        const leadingWhitespace = line.match(/^[\t ]*/)?.[0] || "";

        const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
        const spaceCount = (leadingWhitespace.match(/ /g) || []).length;

        return tabCount + Math.floor(spaceCount / indentWidth);
}

private startsWithClosingBracket(trimmedLine: string): boolean {
        return /^[}\])]/.test(trimmedLine);
}

private findBracketFixes(source: string, lines: string[], indentWidth: number): BracketFix[] {
        const fixes: BracketFix[] = [];
        const stack: BracketInfo[] = [];
        // Track corrected indentation for lines that have fixes
        const lineIndentCorrections = new Map<number, number>();

        let i = 0;
        let line = 0;
        let column = 0;
        let lineStart = 0;

        const openBrackets: Record<string, string> = {
            "{": "}",
            "[": "]",
            "(": ")"
        };

        const closeBrackets: Record<string, string> = {
            "}": "{",
            "]": "[",
            ")": "("
        };

        while (i < source.length) {
            const char = source[i];

            // Handle newlines
            if (char === "\n") {
                line++;
                column = 0;
                lineStart = i + 1;
                i++;
                continue;
            }

            // Skip string literals
            if (char === '"' || char === "'" || char === "`") {
                const result = this.skipString(source, i, char);
                i = result.pos;
                line += result.newlines;
                if (result.newlines > 0) {
                    // Find the last newline position to update lineStart
                    let lastNewline = i - 1;
                    while (lastNewline >= 0 && source[lastNewline] !== "\n") {
                        lastNewline--;
                    }
                    lineStart = lastNewline + 1;
                }
                column = i - lineStart;
                continue;
            }

            // Skip single-line comments
            if (char === "/" && source[i + 1] === "/") {
                while (i < source.length && source[i] !== "\n") {
                    i++;
                }
                continue;
            }

            // Skip multi-line comments
            if (char === "/" && source[i + 1] === "*") {
                i += 2;
                while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) {
                    if (source[i] === "\n") {
                        line++;
                        lineStart = i + 1;
                    }
                    i++;
                }
                i += 2;
                column = i - lineStart;
                continue;
            }

            // Skip regex literals (basic detection)
            if (char === "/" && this.isRegexStart(source, i)) {
                i = this.skipRegex(source, i);
                column = i - lineStart;
                continue;
            }

            // Handle opening brackets
            if (openBrackets[char]) {
                // Use corrected indent if this line has a fix, otherwise use current indent
                const lineIndent = lineIndentCorrections.has(line)
                    ? lineIndentCorrections.get(line)!
                    : this.getLineIndentLevel(lines[line], indentWidth);
                stack.push({
                    char,
                    position: i,
                    line,
                    lineIndent
                });
            }

            // Handle closing brackets
            if (closeBrackets[char]) {
                const expectedOpen = closeBrackets[char];
                // Find matching opening bracket
                let matchIndex = -1;
                for (let j = stack.length - 1; j >= 0; j--) {
                    if (stack[j].char === expectedOpen) {
                        matchIndex = j;
                        break;
                    }
                }

                if (matchIndex !== -1) {
                    const openBracket = stack[matchIndex];
                    stack.splice(matchIndex, 1);

                    // Only fix if the closing bracket is on a different line
                    if (line !== openBracket.line) {
                        const currentIndent = this.getLineIndentLevel(lines[line], indentWidth);
                        const trimmedLine = lines[line].trimStart();

                        // Only fix if this is a line that starts with closing brackets
                        if (this.startsWithClosingBracket(trimmedLine)) {
                            if (currentIndent !== openBracket.lineIndent) {
                                fixes.push({
                                    position: i,
                                    line,
                                    column,
                                    targetIndent: openBracket.lineIndent
                                });
                                // Record the corrected indent for this line
                                // so any opening brackets on this line use the corrected value
                                if (!lineIndentCorrections.has(line)) {
                                    lineIndentCorrections.set(line, openBracket.lineIndent);
                                }
                            }
                        }
                    }
                }
            }

            i++;
            column++;
        }

        return fixes;
}

apply(source: string, filePath?: string): string {
        const config = this.getCodeStyleConfig();
        if (!config?.indentStyle || !config.indentWidth) {
            return source;
        }

        const indentWidth = config.indentWidth;
        const indentUnit = config.indentStyle === "tab" ? "\t" : " ".repeat(indentWidth);

        const lines = source.split("\n");
        const fixes = this.findBracketFixes(source, lines, indentWidth);

        if (fixes.length === 0) {
            return source;
        }

        // Group fixes by line number
        const fixesByLine = new Map<number, BracketFix[]>();
        for (const fix of fixes) {
            if (!fixesByLine.has(fix.line)) {
                fixesByLine.set(fix.line, []);
            }
            fixesByLine.get(fix.line)!.push(fix);
        }

        // Apply fixes line by line
        const result: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const lineFixes = fixesByLine.get(i);
            if (lineFixes && lineFixes.length > 0) {
                // For lines with closing brackets, use the indent of the first (outermost) bracket
                // Sort by column to get the leftmost bracket first
                lineFixes.sort((a, b) => a.column - b.column);
                const primaryFix = lineFixes[0];
                const trimmedLine = lines[i].trimStart();
                const newIndent = indentUnit.repeat(primaryFix.targetIndent);
                result.push(newIndent + trimmedLine);
            } else {
                result.push(lines[i]);
            }
        }

        return result.join("\n");
}
}

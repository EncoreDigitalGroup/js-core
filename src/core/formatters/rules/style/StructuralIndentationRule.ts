/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";
import {findRangeContaining, ProtectedRange} from "../../LineProtection";

/**
 * Reindents code to the configured width by deriving each line's indent from actual bracket nesting
 * rather than rescaling the whitespace already present. This converts a file indented at any width
 * (e.g. 2-space source against a 4-space target) to the configured convention, where the old
 * floor-division approach collapsed any indentation narrower than one level to column zero.
 *
 * A single forward pass computes the emitted indent level of every line:
 *   - Bodies indent one level past the line that opened their bracket; brackets opened on the same
 *     source line share one level, so `describe("x", () => {` indents its body once, not twice.
 *   - A line that continues the previous statement (a leading `&&`/`?`/`.`, a trailing operator, or the
 *     body of a braceless `if`/`for`/etc.) earns one extra level so its continuation indent survives —
 *     unless a bracket opened by the statement already supplied that level. This is a heuristic: unusual
 *     or deeply nested continuations may be misjudged, which only shifts indentation, never structure.
 *   - Because a bracket's body indents one past its opening line's *emitted* level, a continuation
 *     bonus compounds correctly into brackets opened on that continuation line.
 *   - A line that begins with a closing bracket dedents one level, so it aligns with the line that
 *     opened the bracket — including multi-closer lines such as `}]` or `));`, which align to the
 *     opener of their leftmost (innermost) closer.
 *
 * The scan skips strings, comments, regex literals, and protected ranges (JSX text/expressions,
 * template literals) so brackets inside them never shift the count.
 */
export class StructuralIndentationRule extends BaseFormattingRule {
    readonly name = "StructuralIndentationRule";

    /** True for the leading `a-z A-Z _ $` of a method-chain member (never a `.` that begins a spread). */
    private isIdentifierStart(char: string | undefined): boolean {
        if (char === undefined) {
            return false;
        }

        return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_" || char === "$";
    }

    /** True when the line opens a ternary branch: a `?` value or a `:` value (not `?.`/`??`/`?:`/`?=`). */
    private startsTernaryBranch(content: string): boolean {
        // `?` branch: a `?` not forming `?.`, `??`, `?:`, or `?=`.
        if (content.startsWith("?") && content[1] !== undefined && !".?:=".includes(content[1])) {
            return true;
        }

        // `:` branch: a bare `:` or one followed by a value or a closing paren.
        return content.startsWith(":") && (content.length === 1 || content[1] === " " || content[1] === "\t" || content[1] === ")");
    }

    /**
     * True when the line opens with a token that can only continue the preceding expression: a boolean
     * or bitwise operator, a union/intersection type member (a single `|`/`&`), a nullish/arithmetic/
     * concat operator, a method-chain dot, or a ternary `?`/`:` branch.
     */
    private startsWithContinuationToken(content: string): boolean {
        // `|`/`&` cover both the single (union/intersection, bitwise) and doubled (boolean) operators;
        // `??` is nullish coalescing; `+`/`-` are arithmetic or string concatenation.
        if (content.startsWith("|") || content.startsWith("&") || content.startsWith("??")) {
            return true;
        }

        if (content.startsWith("+") || content.startsWith("-")) {
            return true;
        }

        // `.name` continues a method chain; a leading `.` before a non-identifier is a `...` spread.
        if (content.startsWith(".") && this.isIdentifierStart(content[1])) {
            return true;
        }

        return this.startsTernaryBranch(content);
    }

    /** True when the previous line is a braceless `if`/`else if`/`for`/`while`/`else`/`do` header. */
    private isBracelessControlHeader(prev: string): boolean {
        if (prev === "else" || prev === "do") {
            return true;
        }

        const isHeaderKeyword = /^(if|else if|for|while)\b/.test(prev);
        return isHeaderKeyword && prev.endsWith(")");
    }

    /** True when the previous line ends with a binary/arrow operator that needs a right-hand operand. */
    private endsWithContinuationOperator(prev: string): boolean {
        if (prev.endsWith("&&") || prev.endsWith("||") || prev.endsWith("??") || prev.endsWith("=>")) {
            return true;
        }

        const last = prev[prev.length - 1];

        // Arithmetic operators, or any trailing `=` (assignment, or a `==`/`<=`/`>=`/`!=` comparison).
        return last === "+" || last === "-" || last === "*" || last === "/" || last === "%" || last === "=";
    }

    /**
     * True when a line syntactically continues the previous statement and so earns one extra indent
     * level beyond its bracket nesting — a multi-line boolean/ternary expression, a method chain, a
     * value split across an `=`/operator, or the single-statement body of a braceless `if`/`for`/etc.
     * This restores the continuation indentation that a purely bracket-derived level would drop. It is
     * a heuristic: unusual or nested continuations may be misjudged, which only shifts indentation.
     */
    private isContinuationLine(prevCode: string | null, content: string): boolean {
        if (this.startsWithContinuationToken(content)) {
            return true;
        }

        if (prevCode === null) {
            return false;
        }

        // Drop a trailing line comment so the operator test looks at the code, not the comment.
        const commentStart = prevCode.indexOf("//");
        const prev = (commentStart === -1 ? prevCode : prevCode.slice(0, commentStart)).trimEnd();
        return this.isBracelessControlHeader(prev) || this.endsWithContinuationOperator(prev);
    }

    /** True when the line begins a method-chain member (`.name`), never a `...` spread or `.5` number. */
    private startsMethodChainDot(content: string): boolean {
        return content.startsWith(".") && this.isIdentifierStart(content[1]);
    }

    /**
     * The emitted indent level (in units of indentWidth) for each line, from a single forward pass over
     * the source. Bracket bodies indent one past their opening line's emitted level, and continuation
     * lines earn one extra level, so both compose correctly. Non-code lines (blank, comment, or those
     * beginning inside a protected range) are assigned their enclosing bracket level and never act as a
     * continuation antecedent; the apply pass handles how they are actually emitted.
     */
    private computeEmittedLevels(source: string, lines: string[], protectedRanges: ProtectedRange[], scanRanges: ProtectedRange[], jsxMarkers: Map<number, number>): number[] {
        const emitted = new Array(lines.length).fill(0);
        const lineStartOffset = new Array(lines.length).fill(0);

        for (let k = 0, off = 0; k < lines.length; k++) {
            lineStartOffset[k] = off;
            off += lines[k].length + 1;
        }

        // Each open bracket carries the indent level its body sits at and its opening character. A
        // bracket opened on the same line as the current top reuses that level instead of adding another.
        const stack: Array<{ openLine: number; level: number; char: string }> = [];

        // Trimmed content of the previous real code line, its line index, and whether it was itself a
        // continuation (and specifically a ternary branch). A continuation line indents relative to the
        // line it continues, so these carry the run's state forward.
        let prevCode: string | null = null;
        let prevCodeLine = -1;
        let prevWasContinuation = false;
        let prevWasTernary = false;

        // The most recent `)` that closed a paren spanning multiple lines (e.g. a wrapped `if (...)`
        // condition). A `{` opening on that same line is the statement's block, so its body aligns to
        // the statement rather than to the deep continuation level the `{` physically sits at.
        let multiLineParenClose: { line: number; level: number } | null = null;

        // The indent level and bracket depth of the current method-chain's dots. Every `.link` in one
        // chain aligns to the first, so once a chain establishes its level, later dots at that same
        // bracket depth reuse it — even across an intervening line that an earlier link pushed deeper
        // (e.g. a multi-line `.filter(a && b)` above a `.map(...)`). Cleared when the enclosing bracket
        // closes or a fresh statement begins at or above the chain's depth.
        let chainLevel: number | null = null;
        let chainDepth = -1;

        // Compute the emitted level for a line at the moment the scan reaches its start, using the
        // bracket stack accumulated from earlier lines. Must run before this line's brackets are pushed.
        const enterLine = (lineIndex: number): void => {
            const base = stack.length > 0 ? stack[stack.length - 1].level : 0;
            const raw = lines[lineIndex] ?? "";
            const leadingWs = (raw.match(/^\s*/)?.[0] ?? "").length;
            const trimmed = raw.slice(leadingWs);
            const firstCharOffset = lineStartOffset[lineIndex] + leadingWs;

            // Non-code lines take their enclosing bracket level; the apply pass decides how they emit.
            // A protected block (multi-line template/JSX) ends any statement it interrupts, so it clears
            // the continuation antecedent — but a blank line or comment leaves it intact, so a statement
            // split by a blank line (e.g. a `+`-concatenation) still reads as a continuation.
            const isProtected = findRangeContaining(protectedRanges, firstCharOffset) !== undefined;
            if (trimmed === "" || isProtected || trimmed.startsWith("//") || trimmed.startsWith("*")) {
                emitted[lineIndex] = base;

                if (isProtected) {
                    prevCode = null;
                    prevCodeLine = -1;
                }

                return;
            }

            // A `</`-led JSX closing tag dedents just like a closing bracket, aligning with its opening
            // tag's line rather than sitting a level deeper with the element's children.
            const startsWithCloser = /^(<\/|[}\])])/.test(trimmed);
            const isContinuation = !startsWithCloser && prevCodeLine >= 0 && this.isContinuationLine(prevCode, trimmed);
            const isTernary = this.startsTernaryBranch(trimmed);
            const isChainDot = this.startsMethodChainDot(trimmed);
            const top = stack.length > 0 ? stack[stack.length - 1] : null;
            const depth = stack.length;

            // A chain whose enclosing bracket has since closed is over; forget its level.
            if (chainLevel !== null && depth < chainDepth) {
                chainLevel = null;
            }

            if (isContinuation && isChainDot && chainLevel !== null && depth === chainDepth) {
                // A later link of a chain already seen at this bracket depth aligns to the first link,
                // regardless of how deep an earlier link's arguments were indented in between.
                emitted[lineIndex] = chainLevel;
            } else if (isContinuation && top !== null && top.openLine >= prevCodeLine) {
                // A continuation that is the first line inside a bracket opened on the line it continues
                // (e.g. `a || (b` then `&& c)`) takes the bracket's indent — the bracket already stepped
                // it one level in past the operator line.
                emitted[lineIndex] = top.level;
            } else if (isContinuation) {
                // Otherwise a continuation indents relative to the line it continues, not to the
                // enclosing bracket. The first line of a continuation run steps one level in; later lines
                // of the same run stay flat with it, so `a || b || c` and `x.map().filter()` align rather
                // than stair-stepping. A ternary `?`/`:` branch is the exception — it steps in from its
                // condition even mid-run — but `?` and `:` align with each other.
                const stepsIn = !prevWasContinuation || (isTernary && !prevWasTernary);
                emitted[lineIndex] = Math.max(0, emitted[prevCodeLine] + (stepsIn ? 1 : 0));
            } else {
                emitted[lineIndex] = Math.max(0, base - (startsWithCloser ? 1 : 0));
            }

            // Record the level a chain's first dot establishes so its later dots reuse it; a fresh
            // statement at or above the chain's depth ends the chain.
            if (isContinuation && isChainDot) {
                chainLevel = emitted[lineIndex];
                chainDepth = depth;
            } else if (!isContinuation && chainLevel !== null && depth <= chainDepth) {
                chainLevel = null;
            }

            // A `/*` opener is comment text, not a continuation antecedent for the following code line.
            if (trimmed.startsWith("/*")) {
                prevCode = null;
                prevCodeLine = -1;
                prevWasContinuation = false;
                prevWasTernary = false;
            } else {
                prevCode = trimmed;
                prevCodeLine = lineIndex;
                prevWasContinuation = isContinuation;
                prevWasTernary = isContinuation && isTernary;
            }
        };

        enterLine(0);

        let i = 0;
        let line = 0;

        while (i < source.length) {
            // Skip strings, template/regex literals, and JSX text/expressions opaquely, advancing the
            // line counter but never touching the stack for `{}()[]` that appear inside them. These
            // ranges come from the AST, so the scanner needs no string- or regex-tokenizing heuristics.
            const activeRange = findRangeContaining(scanRanges, i);
            if (activeRange) {
                while (i < activeRange.end) {
                    if (source[i] === "\n") {
                        line++;
                        enterLine(line);
                    }

                    i++;
                }

                continue;
            }

            // A JSX opening/closing tag changes nesting depth exactly like a bracket, but `<`/`>` are
            // not brackets — the AST-derived markers tell us where. An opening tag pushes a level so the
            // element's children indent one deeper; a closing tag pops it.
            const jsxDelta = jsxMarkers.get(i);
            if (jsxDelta === 1) {
                const sameLineAsTop = stack.length > 0 && stack[stack.length - 1].openLine === line;
                const level = sameLineAsTop ? stack[stack.length - 1].level : emitted[line] + 1;
                stack.push({openLine: line, level, char: "<"});
                i++;
                continue;
            } else if (jsxDelta === -1) {
                stack.pop();
                i++;
                continue;
            }

            const char = source[i];
            if (char === "\n") {
                line++;
                enterLine(line);
                i++;
                continue;
            }

            // Comments are trivia, not AST literal ranges, so they are still skipped lexically here.
            // A `/` that opens a regex was already skipped as an AST range above, so any `/` reaching
            // this point is a comment delimiter or a division operator — never a regex start.
            if (char === "/" && source[i + 1] === "/") {
                while (i < source.length && source[i] !== "\n") {
                    i++;
                }

                continue;
            }

            if (char === "/" && source[i + 1] === "*") {
                i += 2;

                while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) {
                    if (source[i] === "\n") {
                        line++;
                        enterLine(line);
                    }

                    i++;
                }

                i += 2;
                continue;
            }

            if (char === "{" || char === "[" || char === "(") {
                // A bracket's body indents one past this line's emitted level; brackets sharing the line
                // with an already-open one reuse its level rather than adding another. A `{` that opens
                // right after a multi-line `)` closed on this line is the statement's block, so it takes
                // the statement's level rather than the continuation level the line was emitted at.
                const sameLineAsTop = stack.length > 0 && stack[stack.length - 1].openLine === line;
                let level: number;

                if (char === "{" && multiLineParenClose && multiLineParenClose.line === line) {
                    level = multiLineParenClose.level;
                } else if (sameLineAsTop) {
                    level = stack[stack.length - 1].level;
                } else {
                    level = emitted[line] + 1;
                }

                stack.push({openLine: line, level, char});
            } else if (char === "}" || char === "]" || char === ")") {
                const popped = stack.pop();

                // Remember a `)` that closed a paren opened on an earlier line, so a `{` following it on
                // this line can align its block to the statement that opened the paren.
                if (popped && char === ")" && popped.openLine !== line) {
                    multiLineParenClose = {line, level: popped.level};
                }
            }

            i++;
        }

        return emitted;
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config?.indentStyle || !config.indentWidth) {
            return;
        }

        const indentWidth = config.indentWidth;
        const indentUnit = config.indentStyle === "tab" ? "\t" : " ".repeat(indentWidth);
        const source = context.getText();
        const protectedRanges = context.getProtectedRanges();
        const scanRanges = context.getLiteralScanRanges();
        const jsxMarkers = new Map<number, number>();

        for (const marker of context.getJsxDepthMarkers()) {
            jsxMarkers.set(marker.pos, marker.delta);
        }

        const lines = source.split("\n");
        const emitted = this.computeEmittedLevels(source, lines, protectedRanges, scanRanges, jsxMarkers);
        const result: string[] = [];

        // Track whether we are inside a multi-line block comment (`/* ... */`) and the indentation
        // applied to its opening line, so continuation lines align their `*` one space in from the
        // opening `/*` (standard JSDoc/block-comment alignment) instead of being reindented as code.
        let inBlockComment = false;
        let commentBaseIndent = "";
        let lineStart = 0;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const currentLineStart = lineStart;

            lineStart += line.length + 1;

            const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
            const content = line.substring(leadingWhitespace.length);

            // Skip empty lines, and any line whose own content begins inside a protected range — JSX
            // text/expressions or a multi-line template literal — since reindenting those would rewrite
            // whitespace that is semantically significant there. A line that merely *contains* a template
            // literal further along (e.g. a single-line call passing one) is still real code and is
            // reindented normally; only lines that start inside the protected span are frozen.
            if (content === "" || findRangeContaining(protectedRanges, currentLineStart + leadingWhitespace.length)) {
                result.push(line);
                continue;
            }

            // Continuation of a multi-line block comment: align each `*`-prefixed line one space in from
            // the opening `/*`. Non-`*` body lines (e.g. code samples) are left untouched.
            if (inBlockComment) {
                if (content.startsWith("*")) {
                    result.push(commentBaseIndent + " " + content);
                } else {
                    result.push(line);
                }

                if (content.includes("*/")) {
                    inBlockComment = false;
                }

                continue;
            }

            const newIndent = indentUnit.repeat(emitted[lineIndex]);

            // A line that opens a block comment without closing it on the same line starts a continuation
            // run; record its normalized indent so following `*` lines align to it.
            if (content.startsWith("/*") && !content.includes("*/")) {
                inBlockComment = true;
                commentBaseIndent = newIndent;
            }

            result.push(newIndent + content);
        }

        const after = result.join("\n");
        if (after !== source) {
            context.sourceFile.replaceWithText(after);
        }
    }
}
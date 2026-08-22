/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

type LineKind = "comment" | "close" | "control" | "return" | "major" | "decl" | "import" | "expr";

/**
 * Standardizes blank lines between statements so vertical spacing is predictable:
 *
 * - Exactly one blank line before an `if`/`for`/`while`/`switch`/`do`/`try` block and before a
 *   `return`/`throw`, unless it is the first statement in its block. The exception: no blank before
 *   an `if` whose condition uses a variable declared on the line immediately above it (a guard sits
 *   tight against its declaration).
 * - Exactly one blank line when the statement kind changes (declaration -> expression, after a
 *   closing brace, etc.); none between consecutive statements of the same kind.
 * - No blank line between consecutive imports, but exactly one blank line between the import block
 *   and the first statement of the file body below it.
 * - A blank line between two adjacent block comments, but a doc/section comment stays glued to the
 *   code it documents.
 * - Runs of blank lines collapse to a single blank line.
 *
 * Lines inside JSX/template regions are never touched.
 */
export class StatementSpacingRule extends BaseFormattingRule {
    readonly name = "StatementSpacingRule";

    /** Track entering/leaving a multi-line block comment so its interior is left untouched. */
    private trackBlockComment(trimmed: string, onEnter: () => void, onLeave: () => void): void {
        const opens = trimmed.startsWith("/*");
        const closes = trimmed.includes("*/");
        if (opens && !closes) {
            onEnter();
        } else if (closes) {
            onLeave();
        }
    }

    /** True when the line opens a block/continuation, so the next line is not a fresh statement. */
    private opensScope(trimmed: string): boolean {
        // Comment lines never open a code scope (and `*/` ends in `/`, which must not read as division).
        if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.endsWith("*/")) {
            return false;
        }

        // Test the raw trailing token. A line that ends in `{`/`(`/`[`/`,` or a binary operator opens a
        // block or continuation; a string can never end a line with one of these (its last char is a
        // quote), so no comment-stripping — which would misfire on `//` inside a string literal.
        return /[{([,]$/.test(trimmed) || /(\|\||&&|=>|[=?:])$/.test(trimmed);
    }

    private classify(trimmed: string): LineKind {
        if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
            return "comment";
        }

        if (trimmed.startsWith("}") || trimmed.startsWith(")") || trimmed.startsWith("]")) {
            return "close";
        }

        if (/^(if|for|while|switch|do|try|else|catch|finally)\b/.test(trimmed)) {
            return "control";
        }

        if (/^(return|throw)\b/.test(trimmed)) {
            return "return";
        }

        // Import (and re-export-from) statements group together with no blank line between them, but
        // are separated from the file body that follows by exactly one blank line.
        if (/^import\b/.test(trimmed) || /^export\b[^;]*\bfrom\s*["']/.test(trimmed)) {
            return "import";
        }

        // Major declarations (types, and members that open their own body such as methods, classes,
        // interfaces, enums, functions) are always separated by a blank line from their neighbors.
        const opensBlock = /\{\s*$/.test(trimmed.replace(/\/\/.*$/, ""));

        if (/^(export\s+)?(default\s+)?(abstract\s+)?(class|interface|enum|namespace)\b/.test(trimmed)
            || /^(export\s+)?(async\s+)?function\b/.test(trimmed)
            || /^(export\s+)?type\s+[\w$]/.test(trimmed)
            || (opensBlock && /^(export\s+)?(public\s+|private\s+|protected\s+|static\s+|readonly\s+|async\s+|get\s+|set\s+|override\s+)*(constructor\b|[\w$]+\s*[<(])/.test(trimmed))) {
            return "major";
        }

        // Minor declarations (fields, const/let/var) group together with no blank line between them.
        if (/^(export\s+)?(const|let|var|public|private|protected|static|readonly)\b/.test(trimmed)) {
            return "decl";
        }

        return "expr";
    }

    /** Names bound by a `const`/`let`/`var` declaration line (simple, destructured, or array form). */
    private declaredNames(trimmed: string): string[] {
        const match = trimmed.match(/^(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z0-9_$]+)/);
        if (!match) {
            return [];
        }

        return match[1]
            .replace(/[{}[\]]/g, " ")
            .split(",")
            .map(part => part.split(":").pop()!.trim())
            .filter(name => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));
    }

    /** True for a class member method/accessor (not a standalone function/class/type declaration). */
    private isClassMethod(trimmed: string): boolean {
        const opensBlock = /\{\s*$/.test(trimmed.replace(/\/\/.*$/, ""));
        if (!opensBlock || /^(export|function|class|interface|enum|namespace|type|const|let|var)\b/.test(trimmed)) {
            return false;
        }

        return /^(public\s+|private\s+|protected\s+|static\s+|readonly\s+|async\s+|get\s+|set\s+|override\s+)*(constructor\b|[\w$]+\s*[<(])/.test(trimmed);
    }

    private wantsBlankBefore(prevLine: string, curLine: string): boolean {
        const prev = prevLine.trim();
        const cur = curLine.trim();

        // First statement inside a block, or a continuation of the previous line, never gets a blank.
        if (this.opensScope(prev)) {
            return false;
        }

        // A line that begins with a binary/continuation operator continues the expression above it.
        if (/^(\|\||&&|[?:.]|\)|\])/.test(cur)) {
            return false;
        }

        // The single-statement body of a braceless control header (`if (x)` / `for (...)` / `else`
        // with no `{`) stays attached to its header.
        if (this.classify(prev) === "control" && !prev.endsWith("{")) {
            return false;
        }

        const prevKind = this.classify(prev);
        const curKind = this.classify(cur);

        // A closing bracket hugs the block it terminates.
        if (curKind === "close") {
            return false;
        }

        // A comment that follows code opens a new section and gets a blank; consecutive comments
        // stay together, except two separate block comments are kept apart.
        if (curKind === "comment") {
            if (prevKind === "comment") {
                return prev.includes("*/") && cur.startsWith("/*");
            }

            return true;
        }

        // A comment glues to the statement directly beneath it.
        if (prevKind === "comment") {
            return false;
        }

        // A statement that references a variable declared on the line directly above stays tight
        // against it (a guard, return, or assignment consuming a freshly-declared value).
        if (prevKind === "decl" && curKind !== "major") {
            const names = this.declaredNames(prev);
            if (names.some(name => new RegExp(`\\b${name}\\b`).test(cur))) {
                return false;
            }
        }

        if (curKind === "control") {
            // `try`/`do` and dangling `else`/`catch`/`finally` attach to their surrounding block.
            if (/^(try|do|else|catch|finally)\b/.test(cur)) {
                return false;
            }

            return true;
        }

        if (curKind === "return") {
            return true;
        }

        // A class method flowing directly out of a field/property declaration stays attached to that
        // declaration block. Every other major declaration — a standalone function/class/interface/
        // type/enum, or a method after a closing brace or another major — is separated, as is any
        // statement following a major declaration.
        if (curKind === "major") {
            return !(prevKind === "decl" && this.isClassMethod(cur));
        }

        if (prevKind === "major") {
            return true;
        }

        // Minor declarations and expression statements: blank only when the kind changes.
        return prevKind !== curKind;
    }

    override applyToContext(context: FormatContext): void {
        const source = context.getText();
        const protectedRanges = context.getProtectedRanges();
        const lines = source.split("\n");

        // Character offset at the start of each line, to tell a line that merely contains a
        // single-line template from one that continues a multi-line JSX/template region.
        const lineStartOffsets: number[] = [];
        let offset = 0;

        for (const line of lines) {
            lineStartOffsets.push(offset);
            offset += line.length + 1;
        }

        const continuesProtectedRegion = (i: number): boolean =>
            protectedRanges.some(range => range.start < lineStartOffsets[i] && range.end > lineStartOffsets[i]);

        const result: string[] = [];

        // Index into `lines` of the previous emitted non-blank line, or -1 at a block/file start.
        let prevIndex = -1;
        let insideBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (trimmed === "") {
                // A blank inside a multi-line template/JSX region or block comment is content — keep
                // it. Every other blank is dropped here and re-derived from policy below.
                if (continuesProtectedRegion(i) || insideBlockComment) {
                    result.push(line);
                    prevIndex = i;
                }

                continue;
            }

            // Leave the interior of a multi-line JSX/template region or block comment untouched.
            // A line that only contains a single-line template still takes normal blank-line policy.
            if (continuesProtectedRegion(i) || insideBlockComment) {
                this.trackBlockComment(trimmed, () => (insideBlockComment = true), () => (insideBlockComment = false));
                result.push(line);
                prevIndex = i;
                continue;
            }

            const wantsBlank = prevIndex >= 0 && this.wantsBlankBefore(lines[prevIndex], line);
            if (wantsBlank && result.length > 0) {
                result.push("");
            }

            this.trackBlockComment(trimmed, () => (insideBlockComment = true), () => (insideBlockComment = false));
            result.push(line);
            prevIndex = i;
        }

        const after = result.join("\n") + (source.endsWith("\n") ? "\n" : "");
        if (after !== source) {
            context.sourceFile.replaceWithText(after);
        }
    }
}
/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Node, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/** A whole-region replacement in source-text coordinates (half-open [start, end)). */
interface RegionEdit {
    start: number;
    end: number;
    replacement: string;
}

/**
 * Reformats a function whose single parameter is a multi-line object-destructuring pattern so the
 * pattern is broken onto its own structural level instead of hugging the parameter parenthesis:
 *
 *   function f({                       function f(
 *       a,                                 {
 *       b,                    ->               a,
 *   }: Props) {                                b,
 *                                          }: Props) {
 *
 * The opening `(` ends the signature line; the pattern `{` sits one indent in, its members two
 * indents in, and the closing `}: Type)…{` back at one indent. A single blank line then follows the
 * function body's opening brace. Normalizes any incoming layout (flat, brace-aligned, or already
 * broken out) to this shape, so it is idempotent.
 *
 * Runs last in the code-style batch: it emits indents that are exact multiples of the indent width,
 * so the indentation rules that ran earlier neither need to nor do touch its output on a re-run.
 */
export class DestructuredParamRule extends BaseFormattingRule {
    readonly name = "DestructuredParamRule";

    private readonly functionKinds = new Set<SyntaxKind>([
        SyntaxKind.FunctionDeclaration,
        SyntaxKind.FunctionExpression,
        SyntaxKind.ArrowFunction,
        SyntaxKind.MethodDeclaration,
        SyntaxKind.Constructor,
    ]);

    /** Leading whitespace of the line containing character offset `pos`. */
    private lineIndent(source: string, pos: number): string {
        const lineStart = source.lastIndexOf("\n", pos - 1) + 1;
        const line = source.slice(lineStart, pos);
        return line.match(/^[\t ]*/)?.[0] ?? "";
    }

    /** Collect the region edit for one function-like node, if it has a broken-out-worthy parameter. */
    private collectEdit(node: Node, source: string, indentUnit: string, edits: RegionEdit[]): void {
        const fn = node.asKind(SyntaxKind.FunctionDeclaration)
            ?? node.asKind(SyntaxKind.FunctionExpression)
            ?? node.asKind(SyntaxKind.ArrowFunction)
            ?? node.asKind(SyntaxKind.MethodDeclaration)
            ?? node.asKind(SyntaxKind.Constructor);

        if (!fn) {
            return;
        }

        const params = fn.getParameters();
        if (params.length !== 1) {
            return;
        }

        const nameNode = params[0].getNameNode();
        if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) {
            return;
        }

        const pattern = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern);

        // Only multi-line patterns are reflowed; a single-line destructure param is left alone.
        if (!pattern.getText().includes("\n")) {
            return;
        }

        const body = fn.getBody?.();
        if (!body || body.getKind() !== SyntaxKind.Block) {
            return;
        }

        const patternStart = pattern.getStart(); // the `{`
        const patternEnd = pattern.getEnd(); // just past the `}`

        // Walk back over whitespace from the `{` to the parameter-list `(`.
        let openParen = patternStart - 1;
        while (openParen >= 0 && /[\t \n]/.test(source[openParen])) {
            openParen--;
        }

        if (source[openParen] !== "(") {
            return;
        }

        const bodyBraceEnd = body.getStart() + 1; // just past the body `{`
        const signatureIndent = this.lineIndent(source, openParen);
        const oneIn = signatureIndent + indentUnit;
        const twoIn = signatureIndent + indentUnit + indentUnit;
        const members = pattern.getElements().map(el => el.getText());

        // Text between the pattern `}` and the body `{` (inclusive): `: Type): Return {`.
        const tail = source.slice(patternEnd, bodyBraceEnd);
        const rebuilt = "(\n"
            + oneIn + "{\n"
            + members.map(m => `${twoIn}${m},`).join("\n") + "\n"
            + oneIn + "}" + tail;

        // Region [openParen, bodyBraceEnd) becomes the rebuilt signature. A separate zero-width edit
        // inserts one blank line after the body brace when it is not already present.
        edits.push({start: openParen, end: bodyBraceEnd, replacement: rebuilt});

        if (source[bodyBraceEnd] === "\n" && source[bodyBraceEnd + 1] !== "\n") {
            edits.push({start: bodyBraceEnd, end: bodyBraceEnd, replacement: "\n"});
        }
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config?.indentStyle || !config.indentWidth) {
            return;
        }

        const indentUnit = config.indentStyle === "tab" ? "\t" : " ".repeat(config.indentWidth);
        const source = context.sourceFile.getFullText();
        const edits: RegionEdit[] = [];
        const visit = (node: Node) => {
            if (this.functionKinds.has(node.getKind())) {
                this.collectEdit(node, source, indentUnit, edits);
            }

            node.forEachChild(visit);
        };

        visit(context.sourceFile);

        if (edits.length === 0) {
            return;
        }

        // Apply from end to start so earlier offsets stay valid.
        edits.sort((a, b) => b.start - a.start);

        let result = source;

        for (const edit of edits) {
            result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
        }

        if (result !== source) {
            context.sourceFile.replaceWithText(result);
        }
    }
}
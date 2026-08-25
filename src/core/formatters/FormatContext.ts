/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Project, SourceFile, SyntaxKind, ts} from "ts-morph";

/**
 * Shared, trivia-preserving formatting model built on ts-morph.
 * Parses the target file exactly once and threads the same `SourceFile` through every rule in the pipeline.
 */
export class FormatContext {
    readonly filePath: string;
    readonly project: Project;
    readonly sourceFile: SourceFile;

    private cachedRanges?: Array<{ start: number; end: number }>;
    private cachedScanRanges?: Array<{ start: number; end: number }>;
    private cachedScanText?: string;
    private cachedText?: string;

    constructor(source: string, filePath: string) {
        this.filePath = filePath;
        this.project = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: {
                allowJs: true,
                jsx: ts.JsxEmit.Preserve,
            },
        });

        // Add the file under its real path so ts-morph derives ScriptKind from the extension
        // (.tsx/.jsx -> TSX, else TS) instead of the hardcoded ScriptKind.TS every rule used to pass.
        this.sourceFile = this.project.createSourceFile(filePath, source);
    }

    private computeLiteralScanRanges(): Array<{ start: number; end: number }> {
        const ranges: Array<{ start: number; end: number }> = [];

        // Every lexical construct a bracket counter must treat as opaque: strings, template literals,
        // and regex literals can all contain `{ } ( ) [ ]` that are not real brackets. Sourcing these
        // from the parsed AST is exact, so the scanner needs no string- or regex-tokenizing heuristics
        // (which cannot reliably tell a regex `/.../ ` from division, and mis-tokenize a regex that
        // precedes a template literal on the same line). JSX text/expressions are included too, so a
        // single range set covers everything the scanner skips.
        const kinds = [
            SyntaxKind.StringLiteral,
            SyntaxKind.RegularExpressionLiteral,
            SyntaxKind.NoSubstitutionTemplateLiteral,
            SyntaxKind.TemplateExpression,
            SyntaxKind.JsxText,
            SyntaxKind.JsxExpression,
        ];

        for (const kind of kinds) {
            for (const node of this.sourceFile.getDescendantsOfKind(kind)) {
                ranges.push({start: node.getStart(), end: node.getEnd()});
            }
        }

        return ranges;
    }

    private computeProtectedRanges(): Array<{ start: number; end: number }> {
        const ranges: Array<{ start: number; end: number }> = [];
        const kinds = [
            SyntaxKind.JsxText,
            SyntaxKind.JsxExpression,
            SyntaxKind.TemplateExpression,
            SyntaxKind.NoSubstitutionTemplateLiteral,
        ];

        for (const kind of kinds) {
            for (const node of this.sourceFile.getDescendantsOfKind(kind)) {
                ranges.push({start: node.getStart(), end: node.getEnd()});
            }
        }

        return ranges;
    }

    /**
     * Depth-change markers for JSX element and fragment nesting, as `{pos, delta}` at the offset of
     * each opening/closing tag's `<`. Because `<Tag>`/`</Tag>` are not brackets, a purely bracket-based
     * indenter would flatten nested JSX; the indentation rule consults these markers so JSX children
     * indent one level past their parent tag, exactly as brackets do for code. Self-closing elements
     * change no depth and so contribute no marker.
     */
    getJsxDepthMarkers(): Array<{ pos: number; delta: number }> {
        const markers: Array<{ pos: number; delta: number }> = [];

        for (const el of this.sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement)) {
            markers.push({pos: el.getOpeningElement().getStart(), delta: 1});
            markers.push({pos: el.getClosingElement().getStart(), delta: -1});
        }

        for (const frag of this.sourceFile.getDescendantsOfKind(SyntaxKind.JsxFragment)) {
            markers.push({pos: frag.getOpeningFragment().getStart(), delta: 1});
            markers.push({pos: frag.getClosingFragment().getStart(), delta: -1});
        }

        return markers;
    }

    /**
     * Character ranges of every string, template, and regex literal (and JSX text/expressions) that a
     * bracket scanner must skip, since each may contain `{}()[]` that are not real brackets. Derived
     * from the AST so no lexical heuristics are needed. Recomputed whenever the source text changes.
     */
    getLiteralScanRanges(): Array<{ start: number; end: number }> {
        const text = this.sourceFile.getFullText();
        if (text !== this.cachedScanText) {
            this.cachedScanRanges = this.computeLiteralScanRanges();
            this.cachedScanText = text;
        }

        return this.cachedScanRanges!;
    }

    /**
     * Character ranges of JSX text/expressions and template literals that must not be treated as
     * plain code by rules operating on the shared model. Computed lazily and recomputed whenever the
     * source text has changed since the last computation.
     */
    getProtectedRanges(): Array<{ start: number; end: number }> {
        const text = this.sourceFile.getFullText();
        if (text !== this.cachedText) {
            this.cachedRanges = this.computeProtectedRanges();
            this.cachedText = text;
        }

        return this.cachedRanges!;
    }

    /** Full text of the current, possibly-mutated source file */
    getText(): string {
        return this.sourceFile.getFullText();
    }
}
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
    private cachedRanges?: Array<{ start: number; end: number }>;
    private cachedText?: string;
    readonly filePath: string;
    readonly project: Project;
    readonly sourceFile: SourceFile;
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

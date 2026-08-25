/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {beforeEach, describe, expect, it} from "bun:test";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {DocBlockCommentRule} from "../DocBlockCommentRule";

describe("DocBlockCommentRule", () => {
    let rule: DocBlockCommentRule;
    let container: Container;
    let config: CoreConfig;

    function run(source: string, filePath: string): string {
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    beforeEach(() => {
        container = new Container();
        config = {
            codeStyle: {
                enabled: true,
                quoteStyle: "double",
                semicolons: "always",
                bracketSpacing: true,
                indentation: {
                    type: "spaces",
                    size: 4
                },
                blockSpacing: true,
                docBlockComments: {
                    consolidateSingleLine: true
                }
            }
        } as CoreConfig;

        container.singleton<CoreConfig>(config);
        rule = new DocBlockCommentRule(container);
    });

    describe("applyToContext", () => {
        it("should consolidate single-line doc block comments", () => {
            const input = `/** Transform a source file by visiting all nodes */
function transform() {
    return true;
}`;

            const expected = `/** Transform a source file by visiting all nodes */
function transform() {
    return true;
}`;

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should preserve multi-line doc block comments with multiple content lines", () => {
            const input = `/**
    * This is a multi-line comment
    * with multiple lines of content
    */
function multiLine() {
    return false;
}`;

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle doc blocks with only whitespace", () => {
            const input = `/**
    *
    */
function emptyDoc() {
    return true;
}`;

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle multiple single-line doc blocks in one file", () => {
            const input = `/** First function description */
function first() {}

/** Second function description */
function second() {}`;

            const expected = `/** First function description */
function first() {}

/** Second function description */
function second() {}`;

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle doc blocks with extra whitespace", () => {
            const input = `/** Lots of extra whitespace */
function whitespace() {}`;

            const expected = `/** Lots of extra whitespace */
function whitespace() {}`;

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should not affect regular multi-line comments", () => {
            const input = `/*
    * This is a regular multi-line comment
    * not a doc block comment
    */
function regular() {}`;

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle empty source code", () => {
            const result = run("", "test.ts");
            expect(result).toBe("");
        });

        it("should handle source code without doc blocks", () => {
            const input = `function noComments() {
    return true;
}`;

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("consolidates a single-line doc block in a .tsx file while leaving a JSX-expression comment untouched", () => {
            // A doc block comment on a real declaration outside JSX must still be consolidated in a
            // .tsx file. A comment written as a JSX expression container's trivia (`{/* ... */}`) is
            // itself a protected JsxExpression range and must never be treated as a candidate — it
            // isn't a `/** ... */` doc block to begin with, but this proves the guard doesn't reach in
            // and mangle JSX expression content either.
            const input = `/**
    * Renders the widget
    */
function Component() {
    return <div>{/* not a doc block */}</div>;
}`;

            const expected = `/** Renders the widget */
function Component() {
    return <div>{/* not a doc block */}</div>;
}`;

            const result = run(input, "test.tsx");
            expect(result).toBe(expected);
        });
    });
});
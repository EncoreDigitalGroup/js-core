/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { DocBlockCommentRule } from "../DocBlockCommentRule";


describe("DocBlockCommentRule", () => {
    let rule: DocBlockCommentRule;

    beforeEach(() => {
        rule = new DocBlockCommentRule();
    });

    describe("apply", () => {
        it("should consolidate single-line doc block comments", () => {
            const input = `/** Transform a source file by visiting all nodes */
function transform() {
    return true;
}`;

            const expected = `/** Transform a source file by visiting all nodes */
function transform() {
    return true;
}`;

            const result = rule.apply(input);
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

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should handle doc blocks with only whitespace", () => {
            const input = `/**
    *
    */
function emptyDoc() {
    return true;
}`;

            const result = rule.apply(input);
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

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle doc blocks with extra whitespace", () => {
            const input = `/** Lots of extra whitespace */
function whitespace() {}`;

            const expected = `/** Lots of extra whitespace */
function whitespace() {}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should not affect regular multi-line comments", () => {
            const input = `/*
    * This is a regular multi-line comment
    * not a doc block comment
    */
function regular() {}`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should handle empty source code", () => {
            const result = rule.apply("");
            expect(result).toBe("");
        });

        it("should handle source code without doc blocks", () => {
            const input = `function noComments() {
    return true;
}`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });
    });
});
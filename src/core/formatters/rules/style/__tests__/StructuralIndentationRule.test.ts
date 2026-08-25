/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
import {describe, it, expect, beforeEach} from "bun:test";

// tsfmt-ignore

import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {StructuralIndentationRule} from "../StructuralIndentationRule";


describe("StructuralIndentationRule", () => {
    let config: CoreConfig;

    function run(source: string, filePath: string): string {
        const container = new Container();

        container.singleton<CoreConfig>(config);
        const rule = new StructuralIndentationRule(container);
        const context = new FormatContext(source, filePath);

        rule.applyToContext(context);

        return context.getText();
    }

    beforeEach(() => {
        config = {
            codeStyle: {
                enabled: true,
                indentStyle: "space",
                indentWidth: 4
            }
        } as CoreConfig;
    });

    // Reindentation from bracket/JSX nesting depth: converting a file to the configured width, the
    // continuation heuristic, same-line bracket collapsing, and block-comment alignment. These cover
    // the width-normalizing behavior of the single unified indentation pass.
    describe("width and continuation reindentation", () => {
        function runWith(source: string, filePath: string, cfg: CoreConfig): string {
            const container = new Container();
            container.singleton<CoreConfig>(cfg);

            const rule = new StructuralIndentationRule(container);
            const context = new FormatContext(source, filePath);
            rule.applyToContext(context);

            return context.getText();
        }

        it("reindents mixed/irregular indentation to the configured width from bracket nesting depth", () => {
            // The rule derives each line's level from actual bracket nesting, so inconsistent source
            // indentation (2, 6, 4, 2 spaces, a tab) all collapses to clean depth * indentWidth output.
            const input = [
                "function test() {",
                "  const obj = {",
                "      a: 1,",
                "    b: 2",
                "  };",
                "\treturn obj;",
                "}"
            ].join("\n");

            const golden = "function test() {\n    const obj = {\n        a: 1,\n        b: 2\n    };\n    return obj;\n}";
            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("converts a 2-space source file to the configured 4-space width", () => {
            const input = [
                "export function run(): void {",
                "  const a = 1;",
                "  if (a) {",
                "    doThing();",
                "  }",
                "}"
            ].join("\n");

            const golden = "export function run(): void {\n    const a = 1;\n    if (a) {\n        doThing();\n    }\n}";
            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("reindents a 2-space source file to tabs", () => {
            const input = [
                "function test() {",
                "  const obj = {",
                "    a: 1",
                "  };",
                "  return obj;",
                "}"
            ].join("\n");

            const golden = "function test() {\n\tconst obj = {\n\t\ta: 1\n\t};\n\treturn obj;\n}";
            const cfg = {codeStyle: {enabled: true, indentStyle: "tab", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("indents a multi-line call's arguments one level in from the opening line", () => {
            const input = [
                "process.stdout.write(",
                "message,",
                ");"
            ].join("\n");

            const golden = "process.stdout.write(\n    message,\n);";
            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("collapses brackets opened on the same line into a single indent level", () => {
            // `describe("x", () => {` opens both `(` and `{` on one line; its body must indent one
            // level, not two. This is the common test/callback shape and must not double-indent.
            const input = [
                "describe(\"x\", () => {",
                "  it(\"y\", () => {",
                "    expect(x).toBe(1);",
                "  });",
                "});"
            ].join("\n");

            const golden = "describe(\"x\", () => {\n    it(\"y\", () => {\n        expect(x).toBe(1);\n    });\n});";
            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("leaves a single-line statement that contains a template literal reindentable", () => {
            // The line *contains* a template literal but does not *start* inside one, so its leading
            // indentation is normalized to the function-body level rather than being frozen.
            const input = [
                "export function run(): void {",
                "  exec([`Set ${x}`]);",
                "}"
            ].join("\n");

            const golden = "export function run(): void {\n    exec([`Set ${x}`]);\n}";
            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(golden);
        });

        it("indents nested JSX elements one level per parent tag", () => {
            // `<Tag>`/`</Tag>` are not brackets, so the depth is taken from AST-derived JSX markers;
            // each nested element indents one level past its parent, exactly as brackets do for code.
            const input = [
                "export function C() {",
                "return (",
                "<div>",
                "<section>",
                "<p>hello</p>",
                "</section>",
                "</div>",
                ");",
                "}"
            ].join("\n");

            const golden = [
                "export function C() {",
                "    return (",
                "        <div>",
                "            <section>",
                "                <p>hello</p>",
                "            </section>",
                "        </div>",
                "    );",
                "}"
            ].join("\n");

            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.tsx", cfg)).toBe(golden);
        });

        it("does nothing when indentStyle or indentWidth is not configured", () => {
            const input = "function test() {\n  return 1;\n}";
            const cfg = {codeStyle: {enabled: true}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(input);
        });

        it("aligns block-comment continuation lines one space in from the opening /*", () => {
            const input = [
                "/**",
                "* Top-level doc",
                "* second line",
                "*/",
                "export function foo() {",
                "    /*",
                "    * nested block",
                "    */",
                "    return 1;",
                "}"
            ].join("\n");

            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = runWith(input, "test.ts", cfg);

            // Top-level comment: `*` sits one space in from the column-0 `/**`.
            expect(result).toContain("/**\n * Top-level doc\n * second line\n */");

            // A comment opened at indent 4 aligns its continuation `*` to five spaces.
            expect(result).toContain("    /*\n     * nested block\n     */");
        });

        it("preserves already-aligned block-comment continuation lines", () => {
            const input = [
                "/**",
                " * Already aligned",
                " * second",
                " */",
                "export const x = 1;"
            ].join("\n");

            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            expect(runWith(input, "test.ts", cfg)).toBe(input);
        });

        it("leaves JSX text and a JSX expression container's whitespace byte-for-byte unchanged in a .tsx file", () => {
            const input = [
                "function Component() {",
                "  return (",
                "    <div>",
                "        It's fine over here",
                "      {",
                "          value",
                "      }",
                "    </div>",
                "  );",
                "}"
            ].join("\n");

            const cfg = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = runWith(input, "test.tsx", cfg);

            // Real code is reindented from bracket/JSX nesting: the function body sits at one level,
            // and the `<div>` inside the `return (` parenthesis sits one level deeper again.
            expect(result).toContain("function Component() {\n    return (");
            expect(result).toContain("        <div>");
            expect(result).toContain("        </div>\n    );\n}");

            // JSX text and the JSX expression container's internal whitespace are byte-for-byte
            // untouched, even though their leading whitespace isn't a multiple of indentWidth.
            expect(result).toContain("        It's fine over here");
            expect(result).toContain("      {\n          value\n      }");
        });
    });

    describe("applyToContext", () => {
        it("should fix a single misaligned closing brace", () => {
            // Input has }; at column 0, should be at 4 spaces
            const input = [
                "function test() {",
                "    const obj = {",
                "        a: 1",
                "};",  // Wrong: at column 0
                "    return obj;",
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "    const obj = {",
                "        a: 1",
                "    };",  // Correct: at 4 spaces
                "    return obj;",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should fix nested misaligned closing braces", () => {
            const input = [
                "function test() {",
                "    const outer = {",
                "        inner: {",
                "            value: 1",
                "}",  // Wrong
                "};", // Wrong
                "    return outer;",
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "    const outer = {",
                "        inner: {",
                "            value: 1",
                "        }",  // Fixed to 8 spaces
                "    };",     // Fixed to 4 spaces
                "    return outer;",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should fix deeply nested structures", () => {
            const input = [
                "const obj = {",
                "    a: {",
                "        b: {",
                "            c: {",
                "                d: 1",
                "}",  // Wrong
                "}",  // Wrong
                "}",  // Wrong
                "};"
            ].join("\n");

            const expected = [
                "const obj = {",
                "    a: {",
                "        b: {",
                "            c: {",
                "                d: 1",
                "            }",  // 12 spaces
                "        }",      // 8 spaces
                "    }",          // 4 spaces
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should fix misaligned array brackets", () => {
            const input = [
                "const arr = [",
                "    1,",
                "    2,",
                "    3",
                "];"  // Already correct at column 0
            ].join("\n");

            // No change expected - array at top level, ] at column 0 is correct
            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should fix nested array brackets", () => {
            const input = [
                "const matrix = [",
                "    [1, 2],",
                "    [3, 4]",
                "];"  // Already correct
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should fix mixed bracket types", () => {
            const input = [
                "function test() {",
                "    const obj = {",
                "        arr: [",
                "            1,",
                "            2",
                "]",  // Wrong
                "};", // Wrong
                "    return obj;",
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "    const obj = {",
                "        arr: [",
                "            1,",
                "            2",
                "        ]",  // 8 spaces
                "    };",     // 4 spaces
                "    return obj;",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should not modify correctly indented code", () => {
            const input = [
                "function test() {",
                "    const obj = {",
                "        a: 1,",
                "        b: 2",
                "    };",
                "    return obj;",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should ignore braces inside string literals", () => {
            const input = [
                'const str = "{ not a real brace }";',
                "const obj = {",
                "    value: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should ignore braces inside template literals", () => {
            const input = [
                "const template = `{",
                "    fake brace",
                "}`;",
                "const obj = {",
                "    value: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should ignore braces inside single-line comments", () => {
            const input = [
                "// { comment brace }",
                "const obj = {",
                "    value: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should ignore braces inside multi-line comments", () => {
            const input = [
                "/*",
                " * { comment brace }",
                " */",
                "const obj = {",
                "    value: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle class declarations", () => {
            const input = [
                "class Example {",
                "    method() {",
                "        return {",
                "            a: 1",
                "};",  // Wrong: should be 8 spaces
                "}",   // Wrong: should be 4 spaces
                "}"
            ].join("\n");

            const expected = [
                "class Example {",
                "    method() {",
                "        return {",
                "            a: 1",
                "        };",  // 8 spaces
                "    }",       // 4 spaces
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle if statements", () => {
            const input = [
                "function test() {",
                "    if (condition) {",
                "        doSomething();",
                "}",  // Wrong
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "    if (condition) {",
                "        doSomething();",
                "    }",  // 4 spaces
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle arrow functions", () => {
            const input = [
                "const fn = () => {",
                "    return {",
                "        value: 1",
                "};",  // Wrong
                "};"
            ].join("\n");

            const expected = [
                "const fn = () => {",
                "    return {",
                "        value: 1",
                "    };",  // 4 spaces
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle empty source code", () => {
            const result = run("", "test.ts");
            expect(result).toBe("");
        });

        it("should handle source code without braces", () => {
            const input = [
                "const x = 1;",
                "const y = 2;"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle single-line objects (no change needed)", () => {
            const input = "const obj = { a: 1, b: 2 };";

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle multiple closing brackets on same line at column 0", () => {
            const input = [
                "const obj = {",
                "    nested: {",
                "        value: 1",
                "}};",  // Two brackets at wrong position
            ].join("\n");

            const expected = [
                "const obj = {",
                "    nested: {",
                "        value: 1",
                "    }};",  // Fixed: leftmost bracket determines indent (4 spaces)
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should preserve trailing content after closing braces", () => {
            const input = [
                "const obj = {",
                "    a: 1",
                "}; // trailing comment"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should handle interface declarations", () => {
            const input = [
                "interface Example {",
                "    prop: {",
                "        nested: string;",
                "};",  // Wrong
                "}"
            ].join("\n");

            const expected = [
                "interface Example {",
                "    prop: {",
                "        nested: string;",
                "    };",  // 4 spaces
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle try-catch blocks", () => {
            const input = [
                "function test() {",
                "    try {",
                "        doSomething();",
                "} catch (e) {",  // Wrong: } should be at 4 spaces
                "        handleError();",
                "}",  // Wrong
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "    try {",
                "        doSomething();",
                "    } catch (e) {",  // 4 spaces (matches try)
                "        handleError();",
                "    }",  // 4 spaces (matches catch)
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("should handle multi-line template literals correctly", () => {
            // This tests that the rule handles newlines inside template literals
            const input = [
                "function log() {",
                "    const msg = `Line 1",
                "Line 2",
                "Line 3`;",
                "    const obj = {",
                "        a: 1",
                "};",  // Wrong
                "}"
            ].join("\n");

            const expected = [
                "function log() {",
                "    const msg = `Line 1",
                "Line 2",
                "Line 3`;",
                "    const obj = {",
                "        a: 1",
                "    };",  // 4 spaces
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("does not corrupt indentation around a self-closing JSX tag with an expression container (the regex-literal tokenizer bug)", () => {
            // Pre-migration, the tokenizer's regex-literal heuristic misread the `/>` right after
            // `{x}` as the start of a regex literal (a `}` immediately before a `/` is one of its
            // regex-preceding characters), corrupting the scan. Since `{x}` is a protected JSX
            // expression range, the rule must leave this whole construct untouched.
            const input = [
                "function Component() {",
                "    return (",
                "        <div>",
                "            <Foo bar={x} />",
                "            <span>after</span>",
                "        </div>",
                "    );",
                "}"
            ].join("\n");

            const result = run(input, "test.tsx");
            expect(result).toBe(input);
        });

        it("does not corrupt indentation around an apostrophe inside JSX text (the string-literal tokenizer bug)", () => {
            // Pre-migration, the tokenizer's naive string-literal scanner treated the apostrophe in
            // "It's" as opening a string literal and consumed characters — including real brackets —
            // until it found another apostrophe or backtick, corrupting bracket tracking for whatever
            // code came after. Since the JSX text is a protected range, the rule must leave it
            // untouched and, critically, must still correctly fix real misaligned code that follows it.
            const input = [
                "function outer() {",
                "    function Component() {",
                "        return (",
                "            <div>",
                "                <p>It's fine</p>",
                "            </div>",
                "        );",
                "    }",
                "    const obj = {",
                "        a: 1",
                "};",  // Wrong: should be 4 spaces — a real fix outside the JSX text
                "    return Component;",
                "}"
            ].join("\n");

            const expected = [
                "function outer() {",
                "    function Component() {",
                "        return (",
                "            <div>",
                "                <p>It's fine</p>",
                "            </div>",
                "        );",
                "    }",
                "    const obj = {",
                "        a: 1",
                "    };",  // Fixed to 4 spaces
                "    return Component;",
                "}"
            ].join("\n");

            const result = run(input, "test.tsx");
            expect(result).toBe(expected);
        });
    });

    describe("with tab indentation", () => {
        beforeEach(() => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentStyle: "tab",
                    indentWidth: 4
                }
            } as CoreConfig;
        });

        it("should fix misaligned braces using tabs", () => {
            const input = [
                "function test() {",
                "\tconst obj = {",
                "\t\ta: 1",
                "};",  // Wrong
                "\treturn obj;",
                "}"
            ].join("\n");

            const expected = [
                "function test() {",
                "\tconst obj = {",
                "\t\ta: 1",
                "\t};",  // 1 tab
                "\treturn obj;",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });
    });

    describe("disabled config", () => {
        it("should return source unchanged when indentStyle is not set", () => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentWidth: 4
                }
            } as CoreConfig;

            const input = [
                "const obj = {",
                "    a: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("should return source unchanged when indentWidth is not set", () => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentStyle: "space"
                }
            } as CoreConfig;

            const input = [
                "const obj = {",
                "    a: 1",
                "};"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("aligns a block's closing brace to the statement start when the condition spans lines", () => {
            // The opening `{` sits on a deeper-indented continuation line of a multi-line `if`
            // condition; its closing `}` must align to the `if` (8 spaces), not the `{` line (12).
            const input = [
                "class C {",
                "    method() {",
                "        if (a",
                "            || b",
                "            || c) {",
                "            return 1;",
                "            }",
                "    }",
                "}"
            ].join("\n");

            const expected = [
                "class C {",
                "    method() {",
                "        if (a",
                "            || b",
                "            || c) {",
                "            return 1;",
                "        }",
                "    }",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(expected);
        });

        it("does not over-indent a closing brace when the body has a regex literal with brackets", () => {
            // The regex literals contain `{`, `(`, `[` which must not be counted as real brackets;
            // detection depends on recognizing the regex right after `return`.
            const input = [
                "class C {",
                "    m(s) {",
                "        return /[{([,]$/.test(s) || /(a|b)$/.test(s);",
                "    }",
                "}"
            ].join("\n");

            const result = run(input, "test.ts");
            expect(result).toBe(input);
        });

        it("is idempotent when a line's closing brackets close openers at different indents", () => {
            // `    ));` closes `sortObjectKeys(` (indent 1) and `onObject(` (indent 0). The leftmost
            // closer owns the line, so it must settle at indent 1 and stay there — the inner closer
            // must not drag it to indent 0 on alternating passes (a non-idempotent oscillation).
            const input = [
                "const sortWireit = onObject((wireit) =>",
                "    sortObjectKeys(",
                "        Object.fromEntries(Object.entries(wireit).map(([name, config]) => [name, wrap(config)]))",
                "    ));"
            ].join("\n");

            const once = run(input, "test.ts");
            expect(once).toBe(input);
            expect(run(once, "test.ts")).toBe(once);
        });
    });
});

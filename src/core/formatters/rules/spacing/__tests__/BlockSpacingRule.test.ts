/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {BlockSpacingRule} from "../BlockSpacingRule";

describe("BlockSpacingRule", () => {
    function run(source: string, filePath: string): string {
        const container = new Container();
        const config = {codeStyle: {enabled: true}} as CoreConfig;
        container.singleton<CoreConfig>(config);

        const rule = new BlockSpacingRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("removes excess blank lines inside blocks, after doc comments, and before closing braces in a .ts file, matching the pre-migration golden", () => {
            // Captured from the pre-migration `BlockSpacingRule.apply()` on this exact input, before
            // the rule was migrated to `applyToContext`.
            const input = [
                "interface Foo {",
                "",
                "    bar: string;",
                "",
                "    baz: number;",
                "",
                "}",
                "",
                "/**",
                " * doc",
                " */",
                "",
                "",
                "function f() {}",
                "",
                "const obj = {",
                "",
                "",
                "    a: 1",
                "",
                "",
                "};"
            ].join("\n");

            const golden = "interface Foo {\n    bar: string;\n\n    baz: number;\n}\n\n/**\n * doc\n */\n\n" +

                "function f() {}\n\nconst obj = {\n    a: 1\n};";

            const result = run(input, "test.ts");
            expect(result).toBe(golden);
        });

        it("leaves a blank line immediately before a literal `}` inside a template literal untouched, even though it matches the closing-brace pattern textually", () => {
            const input = [
                "function Component() {",
                "    const msg = `before",
                "",
                "}",
                "after`;",
                "    return msg;",
                "",
                "",
                "}"
            ].join("\n");

            const result = run(input, "test.tsx");

            // Outside the template literal, a real blank run before the function's own closing `}`
            // is still collapsed to a single newline.
            expect(result).toContain("    return msg;\n}");

            // Inside the template literal, the textually-matching `\n\n}` is left byte-for-byte alone.
            expect(result).toContain("`before\n\n}\nafter`;");
        });

        it("leaves a blank line after an opening brace inside a JSX expression container untouched", () => {
            const input = [
                "function Component() {",
                "    return (",
                "        <div>",
                "            {",
                "",
                "                value",
                "            }",
                "        </div>",
                "    );",
                "}"
            ].join("\n");

            const result = run(input, "test.tsx");

            // The blank line right after the JSX expression container's `{` is untouched.
            expect(result).toContain("            {\n\n                value\n            }");
        });
    });
});
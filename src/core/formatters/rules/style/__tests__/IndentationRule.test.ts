/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {IndentationRule} from "../IndentationRule";

describe("IndentationRule", () => {
    function run(source: string, filePath: string, config: CoreConfig): string {
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new IndentationRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("normalizes mixed indentation to spaces in a .ts file, matching the pre-migration golden", () => {
            // Captured from the pre-migration `IndentationRule.apply()` on this exact input, with
            // indentStyle: "space", indentWidth: 4, before the rule was migrated to `applyToContext`.
            const input = [
                "function test() {",
                "  const obj = {",
                "      a: 1,",
                "    b: 2",
                "  };",
                "\treturn obj;",
                "}"
            ].join("\n");

            const golden = "function test() {\nconst obj = {\n    a: 1,\n    b: 2\n};\n    return obj;\n}";
            const config = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(golden);
        });

        it("normalizes indentation to tabs in a .ts file, matching the pre-migration golden", () => {
            // Captured from the pre-migration `IndentationRule.apply()` on this exact input, with
            // indentStyle: "tab", indentWidth: 4, before the rule was migrated to `applyToContext`.
            const input = [
                "function test() {",
                "    const obj = {",
                "        a: 1",
                "    };",
                "    return obj;",
                "}"
            ].join("\n");

            const golden = "function test() {\n\tconst obj = {\n\t\ta: 1\n\t};\n\treturn obj;\n}";
            const config = {codeStyle: {enabled: true, indentStyle: "tab", indentWidth: 4}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(golden);
        });

        it("does nothing when indentStyle or indentWidth is not configured", () => {
            const input = "function test() {\n  return 1;\n}";
            const config = {codeStyle: {enabled: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
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

            const config = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = run(input, "test.ts", config);

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

            const config = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
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

            const config = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
            const result = run(input, "test.tsx", config);

            // Real code is renormalized per the rule's usual (whole-multiples-of-indentWidth) logic.
            expect(result).toContain("function Component() {\nreturn (");
            expect(result).toContain("    <div>");
            expect(result).toContain("    </div>\n);\n}");

            // JSX text and the JSX expression container's internal whitespace are byte-for-byte
            // untouched, even though their leading whitespace isn't a multiple of indentWidth.
            expect(result).toContain("        It's fine over here");
            expect(result).toContain("      {\n          value\n      }");
        });
    });
});

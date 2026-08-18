/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {SemicolonRule} from "../SemicolonRule";

describe("SemicolonRule", () => {
    let rule: SemicolonRule;
    let container: Container;

    function run(source: string, filePath: string, config: CoreConfig): string {
        container = new Container();
        container.singleton<CoreConfig>(config);
        rule = new SemicolonRule(container);

        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("adds missing semicolons in a .ts file when semicolons is 'always'", () => {
            const input = "const foo = 1\nconst bar = 2;";
            const config = {codeStyle: {enabled: true, semicolons: "always"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("const foo = 1;\nconst bar = 2;");
        });

        it("removes semicolons in a .ts file when semicolons is 'never'", () => {
            const input = "const foo = 1;\nconst bar = 2;";
            const config = {codeStyle: {enabled: true, semicolons: "never"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("const foo = 1\nconst bar = 2");
        });

        it("does not add a semicolon after an interface, class, or enum closing brace", () => {
            const input = "interface Foo {\n    bar: string;\n}\nclass Baz {}\nenum Qux { A, B }";
            const config = {codeStyle: {enabled: true, semicolons: "always"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).not.toContain("}\n;");
            expect(result.endsWith(";")).toBe(false);
        });

        it("removes a stray semicolon after an interface closing brace", () => {
            const input = "interface Foo {\n    bar: string;\n};";
            const config = {codeStyle: {enabled: true, semicolons: "always"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("interface Foo {\n    bar: string;\n}");
        });

        it("does nothing when semicolons is not configured", () => {
            const input = "const foo = 1";
            const config = {codeStyle: {enabled: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("adds statement semicolons in a .tsx file without injecting semicolons into JSX", () => {
            const input = "function Component() {\n" +

                "    const value = 1\n" +
                "    return <div>{value}</div>\n" +
                "}";

            const config = {codeStyle: {enabled: true, semicolons: "always"}} as CoreConfig;
            const result = run(input, "test.tsx", config);
            expect(result).toContain("const value = 1;");

            // The JSX itself must not gain any semicolons inside its text/expression content.
            expect(result).toContain("<div>{value}</div>");
            expect(result).not.toContain("{value;}");
            expect(result).not.toContain("<div>;");
        });
    });
});

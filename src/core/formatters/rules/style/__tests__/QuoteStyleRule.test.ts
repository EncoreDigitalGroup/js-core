/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {QuoteStyleRule} from "../QuoteStyleRule";

describe("QuoteStyleRule", () => {
    let rule: QuoteStyleRule;
    let container: Container;

    function run(source: string, filePath: string, config: CoreConfig): string {
        container = new Container();
        container.singleton<CoreConfig>(config);
        rule = new QuoteStyleRule(container);

        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("converts single to double quotes in a .ts file", () => {
            const input = "const foo = 'single quotes';";
            const config = {codeStyle: {enabled: true, quoteStyle: "double"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe('const foo = "single quotes";');
        });

        it("converts double to single quotes in a .ts file", () => {
            const input = 'const foo = "double quotes";';
            const config = {codeStyle: {enabled: true, quoteStyle: "single"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("const foo = 'double quotes';");
        });

        it("leaves quotes unchanged when they already match the configured style", () => {
            const input = 'const foo = "already double";';
            const config = {codeStyle: {enabled: true, quoteStyle: "double"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("skips conversion when the content would require escaping", () => {
            const input = "const foo = 'has \"double\" inside';";
            const config = {codeStyle: {enabled: true, quoteStyle: "double"}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("does nothing when quoteStyle is not configured", () => {
            const input = "const foo = 'single quotes';";
            const config = {codeStyle: {enabled: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("converts string literals inside .tsx code while preserving JSX attribute quotes", () => {
            const input = "const label = 'hello';\n" +

                "const el = <div className='container' title=\"tooltip\">text</div>;";

            const config = {codeStyle: {enabled: true, quoteStyle: "double"}} as CoreConfig;
            const result = run(input, "test.tsx", config);
            expect(result).toContain('const label = "hello";');

            // JSX attribute quotes must be preserved exactly as written
            expect(result).toContain("className='container'");
            expect(result).toContain('title="tooltip"');
        });

        it("preserves JSX structure and text content in .tsx files", () => {
            const input = "function Component() {\n" +

                "    return <div className='wrapper'>{'child text'}<span>literal jsx text</span></div>;\n" +
                "}";

            const config = {codeStyle: {enabled: true, quoteStyle: "double"}} as CoreConfig;
            const result = run(input, "test.tsx", config);
            expect(result).toContain("className='wrapper'");
            expect(result).toContain("{\"child text\"}");
            expect(result).toContain("<span>literal jsx text</span>");
        });
    });
});
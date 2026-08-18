/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {BracketSpacingRule} from "../BracketSpacingRule";

describe("BracketSpacingRule", () => {
    let rule: BracketSpacingRule;
    let container: Container;

    function run(source: string, filePath: string, config: CoreConfig): string {
        container = new Container();
        container.singleton<CoreConfig>(config);
        rule = new BracketSpacingRule(container);

        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("adds spacing inside an object literal in a .ts file when bracketSpacing is true", () => {
            const input = "const foo = {bar: 1};";
            const config = {codeStyle: {enabled: true, bracketSpacing: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("const foo = { bar: 1 };");
        });

        it("removes spacing inside an object literal in a .ts file when bracketSpacing is false", () => {
            const input = "const foo = { bar: 1 };";
            const config = {codeStyle: {enabled: true, bracketSpacing: false}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("const foo = {bar: 1};");
        });

        it("adds spacing inside named imports", () => {
            const input = "import {foo, bar} from \"module\";";
            const config = {codeStyle: {enabled: true, bracketSpacing: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe("import { foo, bar } from \"module\";");
        });

        it("leaves an empty object literal unchanged", () => {
            const input = "const foo = {};";
            const config = {codeStyle: {enabled: true, bracketSpacing: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("does nothing when bracketSpacing is not configured", () => {
            const input = "const foo = {bar: 1};";
            const config = {codeStyle: {enabled: true}} as CoreConfig;
            const result = run(input, "test.ts", config);
            expect(result).toBe(input);
        });

        it("adds spacing to a normal object literal in a .tsx file but leaves an object literal that is the direct child of a JSX expression container untouched", () => {
            const input = "function Component() {\n" +

                "    const style = {color: 'red'};\n" +
                "    return <div>{{notAnObjectLiteralAttribute: true}}</div>;\n" +
                "}";

            const config = {codeStyle: {enabled: true, bracketSpacing: true}} as CoreConfig;
            const result = run(input, "test.tsx", config);
            expect(result).toContain("const style = { color: 'red' };");

            // The inner object literal here is the direct child of a JsxExpression container and must be
            // excluded from bracket spacing, so its braces stay exactly as written.
            expect(result).toContain("<div>{{notAnObjectLiteralAttribute: true}}</div>");
        });
    });
});

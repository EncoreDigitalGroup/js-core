/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {StatementSpacingRule} from "../StatementSpacingRule";

describe("StatementSpacingRule", () => {
    function run(source: string): string {
        const container = new Container();
        container.singleton<CoreConfig>({codeStyle: {enabled: true}} as CoreConfig);

        const rule = new StatementSpacingRule(container);
        const context = new FormatContext(source, "test.ts");
        rule.applyToContext(context);

        return context.getText();
    }

    it("adds a blank line before an if that follows an unrelated statement", () => {
        const input = [
            "function f() {",
            "    doThing();",
            "    if (ready) {",
            "        go();",
            "    }",
            "}"
        ].join("\n");

        const expected = [
            "function f() {",
            "    doThing();",
            "",
            "    if (ready) {",
            "        go();",
            "    }",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("keeps an if tight against a const it uses as a guard", () => {
        const input = [
            "function f() {",
            "    const match = value.match(re);",
            "",
            "    if (match) {",
            "        use(match);",
            "    }",
            "}"
        ].join("\n");

        const expected = [
            "function f() {",
            "    const match = value.match(re);",
            "    if (match) {",
            "        use(match);",
            "    }",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("keeps a return tight against a const it consumes", () => {
        const input = [
            "function f() {",
            "    const result = compute();",
            "",
            "    return result;",
            "}"
        ].join("\n");

        const expected = [
            "function f() {",
            "    const result = compute();",
            "    return result;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("adds a blank line before a return that follows an unrelated statement", () => {
        const input = [
            "function f() {",
            "    sideEffect();",
            "    return 1;",
            "}"
        ].join("\n");

        const expected = [
            "function f() {",
            "    sideEffect();",
            "",
            "    return 1;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("groups fields, attaches the first method to them, and separates methods from each other", () => {
        const input = [
            "class C {",
            "    private a = 1;",
            "",
            "    private b = 2;",
            "    first() {",
            "        return this.a;",
            "    }",
            "    second() {",
            "        return this.b;",
            "    }",
            "}"
        ].join("\n");

        const expected = [
            "class C {",
            "    private a = 1;",
            "    private b = 2;",
            "    first() {",
            "        return this.a;",
            "    }",
            "",
            "    second() {",
            "        return this.b;",
            "    }",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("keeps a braceless control body attached to its header", () => {
        const input = [
            "function f(name) {",
            "    if (!name)",
            "        return;",
            "    use(name);",
            "}"
        ].join("\n");

        // No blank between `if (!name)` and its single-statement body; a blank separates the body run.
        const expected = [
            "function f(name) {",
            "    if (!name)",
            "        return;",
            "",
            "    use(name);",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("separates a standalone function from a preceding declaration but attaches a class method", () => {
        const moduleInput = [
            "export const a = 1;",
            "export function f() {",
            "    return a;",
            "}"
        ].join("\n");

        const moduleExpected = [
            "export const a = 1;",
            "",
            "export function f() {",
            "    return a;",
            "}"
        ].join("\n");

        expect(run(moduleInput)).toBe(moduleExpected);

        const classInput = [
            "class C {",
            "    readonly name = \"C\";",
            "    method() {",
            "        return this.name;",
            "    }",
            "}"
        ].join("\n");

        // The first method stays attached to the field block (no blank).
        expect(run(classInput)).toBe(classInput);
    });

    it("keeps a first-in-block return tight when the block header contains // inside a string", () => {
        const input = [
            "function f(s) {",
            "    if (s.startsWith(\"//\") || s.endsWith(\"*/\")) {",
            "        return false;",
            "    }",
            "}"
        ].join("\n");

        // The header ends with `{`, so the return is the first statement in the block: no blank.
        expect(run(input)).toBe(input);
    });

    it("does not insert a blank line inside a multi-line leading-operator expression", () => {
        const input = [
            "function f() {",
            "    return a",
            "        && b",
            "        && c;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(input);
    });

    it("leaves the blank interior of a multi-line template literal untouched", () => {
        const input = [
            "function f() {",
            "    log(`line1",
            "",
            "line3`);",
            "    next();",
            "}"
        ].join("\n");

        // The blank inside the template is content and must survive; the two calls stay grouped.
        expect(run(input)).toBe(input);
    });
});
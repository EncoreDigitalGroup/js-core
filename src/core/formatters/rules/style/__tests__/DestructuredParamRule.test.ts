/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {DestructuredParamRule} from "../DestructuredParamRule";

describe("DestructuredParamRule", () => {
    function run(source: string, filePath = "test.tsx"): string {
        const config = {codeStyle: {enabled: true, indentStyle: "space", indentWidth: 4}} as CoreConfig;
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new DestructuredParamRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    it("breaks a flat multi-line destructured parameter onto its own structural level", () => {
        const input = [
            "export function C({",
            "    a,",
            "    b,",
            "}: Props): ReactElement {",
            "    return a + b;",
            "}"
        ].join("\n");

        const expected = [
            "export function C(",
            "    {",
            "        a,",
            "        b,",
            "    }: Props): ReactElement {",
            "",
            "    return a + b;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("normalizes a brace-aligned parameter to the same broken-out shape (idempotent target)", () => {
        const aligned = [
            "export function C({",
            "                      a,",
            "                      b,",
            "                  }: Props): ReactElement {",
            "",
            "    return a + b;",
            "}"
        ].join("\n");

        const broken = [
            "export function C(",
            "    {",
            "        a,",
            "        b,",
            "    }: Props): ReactElement {",
            "",
            "    return a + b;",
            "}"
        ].join("\n");

        expect(run(aligned)).toBe(broken);
        expect(run(broken)).toBe(broken);
    });

    it("leaves a single-line destructured parameter untouched", () => {
        const input = "export function C({a, b}: Props): void {\n    return;\n}";
        expect(run(input)).toBe(input);
    });

    it("leaves a function with a non-destructured multi-line parameter list untouched", () => {
        const input = [
            "function buildRows(",
            "    commands: Command[],",
            "    query: string,",
            "): Row[] {",
            "    return [];",
            "}"
        ].join("\n");

        expect(run(input)).toBe(input);
    });

    it("ignores a function with more than one parameter", () => {
        const input = [
            "function f({",
            "    a,",
            "}: Props, other: number): void {",
            "    return;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(input);
    });

    it("omits the trailing comma after a rest element (invalid JS otherwise)", () => {
        const input = [
            "export function C({",
            "    onCommit,",
            "    ...rest",
            "}: Props): ReactElement {",
            "    return rest;",
            "}"
        ].join("\n");

        const expected = [
            "export function C(",
            "    {",
            "        onCommit,",
            "        ...rest",
            "    }: Props): ReactElement {",
            "",
            "    return rest;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });

    it("preserves an existing single blank line after the body brace", () => {
        const input = [
            "export function C({",
            "    a,",
            "}: Props): void {",
            "",
            "    return;",
            "}"
        ].join("\n");

        const expected = [
            "export function C(",
            "    {",
            "        a,",
            "    }: Props): void {",
            "",
            "    return;",
            "}"
        ].join("\n");

        expect(run(input)).toBe(expected);
    });
});
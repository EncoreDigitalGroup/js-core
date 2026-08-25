/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {LogicalOperatorPlacementRule} from "../LogicalOperatorPlacementRule";

describe("LogicalOperatorPlacementRule", () => {
    function run(source: string, filePath: string): string {
        const container = new Container();
        container.singleton<CoreConfig>({codeStyle: {enabled: true}} as CoreConfig);

        const rule = new LogicalOperatorPlacementRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    describe("applyToContext", () => {
        it("moves trailing || and && to the start of the next line", () => {
            const input = [
                "        if (ts.isPropertyDeclaration(member) ||",
                "            ts.isMethodDeclaration(member) ||",
                "            ts.isGetAccessorDeclaration(member) ||",
                "            ts.isSetAccessorDeclaration(member)) {"
            ].join("\n");

            const expected = [
                "        if (ts.isPropertyDeclaration(member)",
                "            || ts.isMethodDeclaration(member)",
                "            || ts.isGetAccessorDeclaration(member)",
                "            || ts.isSetAccessorDeclaration(member)) {"
            ].join("\n");

            expect(run(input, "test.ts")).toBe(expected);
        });

        it("drops a blank line inside a wrapped condition (and collapses the short result)", () => {
            const input = [
                "if (a ||",
                "",
                "    b) {"
            ].join("\n");

            // Blank removed, operators lead, then the short two-operand condition collapses to one line.
            expect(run(input, "test.ts")).toBe("if (a || b) {");
        });

        it("collapses a short two-operand wrapped condition onto one line", () => {
            const input = [
                '            if (line.includes("Container.extractGenericTypeName")',
                '                || line.includes("Container.resolve")) {'
            ].join("\n");

            const expected =
                '            if (line.includes("Container.extractGenericTypeName") || line.includes("Container.resolve")) {';
            expect(run(input, "test.ts")).toBe(expected);
        });

        it("keeps a long two-operand condition wrapped (exceeds the length knob)", () => {
            const input = [
                '            if (line.includes("Container.extractGenericTypeNameForRegistration")',
                '                || line.includes("Container.singleton")) {'
            ].join("\n");

            // Collapsed this would exceed the internal length knob, so it stays wrapped with leading ops.
            expect(run(input, "test.ts")).toBe(input);
        });

        it("keeps a condition with more than two operands wrapped regardless of length (idempotent)", () => {
            const input = [
                "if (a",
                "    || b",
                "    || c) {"
            ].join("\n");

            expect(run(input, "test.ts")).toBe(input);
        });

        it("leaves a single-line logical operator untouched", () => {
            const input = 'return declaration.name?.text || "";';
            expect(run(input, "test.ts")).toBe(input);
        });

        it("does not touch an operator inside a line comment", () => {
            const input = "const x = 1; // a || b";
            expect(run(input, "test.ts")).toBe(input);
        });
    });
});
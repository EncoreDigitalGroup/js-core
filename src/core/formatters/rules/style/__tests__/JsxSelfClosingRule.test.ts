/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {JsxSelfClosingRule} from "../JsxSelfClosingRule";

describe("JsxSelfClosingRule", () => {
    function run(source: string, config: CoreConfig): string {
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new JsxSelfClosingRule(container);
        const context = new FormatContext(source, "test.tsx");
        rule.applyToContext(context);

        return context.getText();
    }

    const off = {codeStyle: {enabled: true, jsxSelfClosingSpace: false}} as CoreConfig;
    const on = {codeStyle: {enabled: true, jsxSelfClosingSpace: true}} as CoreConfig;
    it("removes the space before /> when jsxSelfClosingSpace is false", () => {
        expect(run("const a = <Divider />;", off)).toBe("const a = <Divider/>;");
    });

    it("removes the space after an attribute before />", () => {
        expect(run("const a = <Box id=\"x\" />;", off)).toBe("const a = <Box id=\"x\"/>;");
    });

    it("removes the space directly after an expression-container attribute", () => {
        const input = "const a = <Icon sx={{color: \"red\"}} />;";
        expect(run(input, off)).toBe("const a = <Icon sx={{color: \"red\"}}/>;");
    });

    it("adds a single space before /> when jsxSelfClosingSpace is true", () => {
        expect(run("const a = <Divider/>;", on)).toBe("const a = <Divider />;");
        expect(run("const a = <Box id=\"x\"/>;", on)).toBe("const a = <Box id=\"x\" />;");
    });

    it("collapses multiple spaces before /> to one when jsxSelfClosingSpace is true", () => {
        expect(run("const a = <Divider   />;", on)).toBe("const a = <Divider />;");
    });

    it("leaves a /> that sits on its own line untouched", () => {
        const input = "const a = (\n" +

            "    <InputBase\n" +
            "        autoFocus\n" +
            "    />\n" +
            ");";
        expect(run(input, off)).toBe(input);
        expect(run(input, on)).toBe(input);
    });

    it("does nothing when jsxSelfClosingSpace is not configured", () => {
        const input = "const a = <Divider />;";
        expect(run(input, {codeStyle: {enabled: true}} as CoreConfig)).toBe(input);
    });
});
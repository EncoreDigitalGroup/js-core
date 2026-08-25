/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {ConfigTypes, FormatterOrder} from "../ConfigTypes";

describe("ConfigTypes", () => {
    describe("option getters", () => {
        describe("getQuoteStyleOptions", () => {
            it("should return valid quote style options", () => {
                const options = ConfigTypes.getQuoteStyleOptions();
                expect(options).toEqual(["single", "double"]);
                expect(options).toHaveLength(2);
            });
        });

        describe("getSemicolonOptions", () => {
            it("should return valid semicolon options", () => {
                const options = ConfigTypes.getSemicolonOptions();
                expect(options).toEqual(["always", "never"]);
                expect(options).toHaveLength(2);
            });
        });

        describe("getIndentStyleOptions", () => {
            it("should return valid indent style options", () => {
                const options = ConfigTypes.getIndentStyleOptions();
                expect(options).toEqual(["tab", "space"]);
                expect(options).toHaveLength(2);
            });
        });

        describe("getTrailingCommaOptions", () => {
            it("should return valid trailing comma options", () => {
                const options = ConfigTypes.getTrailingCommaOptions();
                expect(options).toEqual(["none", "es5", "all"]);
                expect(options).toHaveLength(3);
            });
        });

        describe("getArrowParenOptions", () => {
            it("should return valid arrow parentheses options", () => {
                const options = ConfigTypes.getArrowParenOptions();
                expect(options).toEqual(["always", "avoid"]);
                expect(options).toHaveLength(2);
            });
        });

        describe("getImportGroupOptions", () => {
            it("should return valid import group options", () => {
                const options = ConfigTypes.getImportGroupOptions();
                expect(options).toEqual(["external", "internal", "relative"]);
                expect(options).toHaveLength(3);
            });
        });

        describe("getFormatterOrderOptions", () => {
            it("should return all formatter order options", () => {
                const options = ConfigTypes.getFormatterOrderOptions();
                expect(options).toContain(FormatterOrder.IndexGeneration);
                expect(options).toContain(FormatterOrder.CodeStyle);
                expect(options).toContain(FormatterOrder.ImportOrganization);
                expect(options).toContain(FormatterOrder.ASTTransformation);
                expect(options).toContain(FormatterOrder.Spacing);
                expect(options).toHaveLength(5);
            });
        });
    });

    describe("validation methods", () => {
        describe("isValidQuoteStyle", () => {
            it("should return true for valid quote styles", () => {
                expect(ConfigTypes.isValidQuoteStyle("single")).toBe(true);
                expect(ConfigTypes.isValidQuoteStyle("double")).toBe(true);
            });

            it("should return false for invalid quote styles", () => {
                expect(ConfigTypes.isValidQuoteStyle("triple")).toBe(false);
                expect(ConfigTypes.isValidQuoteStyle("")).toBe(false);
                expect(ConfigTypes.isValidQuoteStyle("invalid")).toBe(false);
            });
        });

        describe("isValidSemicolonOption", () => {
            it("should return true for valid semicolon options", () => {
                expect(ConfigTypes.isValidSemicolonOption("always")).toBe(true);
                expect(ConfigTypes.isValidSemicolonOption("never")).toBe(true);
            });

            it("should return false for invalid semicolon options", () => {
                expect(ConfigTypes.isValidSemicolonOption("sometimes")).toBe(false);
                expect(ConfigTypes.isValidSemicolonOption("")).toBe(false);
                expect(ConfigTypes.isValidSemicolonOption("invalid")).toBe(false);
            });
        });

        describe("isValidIndentStyle", () => {
            it("should return true for valid indent styles", () => {
                expect(ConfigTypes.isValidIndentStyle("tab")).toBe(true);
                expect(ConfigTypes.isValidIndentStyle("space")).toBe(true);
            });

            it("should return false for invalid indent styles", () => {
                expect(ConfigTypes.isValidIndentStyle("mixed")).toBe(false);
                expect(ConfigTypes.isValidIndentStyle("")).toBe(false);
                expect(ConfigTypes.isValidIndentStyle("invalid")).toBe(false);
            });
        });

        describe("isValidTrailingCommaOption", () => {
            it("should return true for valid trailing comma options", () => {
                expect(ConfigTypes.isValidTrailingCommaOption("none")).toBe(true);
                expect(ConfigTypes.isValidTrailingCommaOption("es5")).toBe(true);
                expect(ConfigTypes.isValidTrailingCommaOption("all")).toBe(true);
            });

            it("should return false for invalid trailing comma options", () => {
                expect(ConfigTypes.isValidTrailingCommaOption("some")).toBe(false);
                expect(ConfigTypes.isValidTrailingCommaOption("")).toBe(false);
                expect(ConfigTypes.isValidTrailingCommaOption("invalid")).toBe(false);
            });
        });

        describe("isValidArrowParenOption", () => {
            it("should return true for valid arrow parentheses options", () => {
                expect(ConfigTypes.isValidArrowParenOption("always")).toBe(true);
                expect(ConfigTypes.isValidArrowParenOption("avoid")).toBe(true);
            });

            it("should return false for invalid arrow parentheses options", () => {
                expect(ConfigTypes.isValidArrowParenOption("sometimes")).toBe(false);
                expect(ConfigTypes.isValidArrowParenOption("")).toBe(false);
                expect(ConfigTypes.isValidArrowParenOption("invalid")).toBe(false);
            });
        });

        describe("isValidIndentWidth", () => {
            it("should return true for valid indent widths", () => {
                expect(ConfigTypes.isValidIndentWidth(1)).toBe(true);
                expect(ConfigTypes.isValidIndentWidth(2)).toBe(true);
                expect(ConfigTypes.isValidIndentWidth(4)).toBe(true);
                expect(ConfigTypes.isValidIndentWidth(8)).toBe(true);
            });

            it("should return false for invalid indent widths", () => {
                expect(ConfigTypes.isValidIndentWidth(0)).toBe(false);
                expect(ConfigTypes.isValidIndentWidth(9)).toBe(false);
                expect(ConfigTypes.isValidIndentWidth(-1)).toBe(false);
                expect(ConfigTypes.isValidIndentWidth(10)).toBe(false);
            });
        });

        describe("isRecommendedLineWidth", () => {
            it("should return true for recommended line widths", () => {
                expect(ConfigTypes.isRecommendedLineWidth(80)).toBe(true);
                expect(ConfigTypes.isRecommendedLineWidth(100)).toBe(true);
                expect(ConfigTypes.isRecommendedLineWidth(120)).toBe(true);
            });

            it("should return false for non-recommended line widths", () => {
                expect(ConfigTypes.isRecommendedLineWidth(79)).toBe(false);
                expect(ConfigTypes.isRecommendedLineWidth(121)).toBe(false);
                expect(ConfigTypes.isRecommendedLineWidth(50)).toBe(false);
                expect(ConfigTypes.isRecommendedLineWidth(200)).toBe(false);
            });
        });
    });
});
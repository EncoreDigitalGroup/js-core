/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {CoreConfig, ImportRestrictionRule} from "../ConfigTypes";
import {ConfigValidator} from "../ConfigValidator";

describe("ConfigValidator", () => {
    describe("validate", () => {
        it("should validate a valid configuration", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    quoteStyle: "double",
                    semicolons: "always",
                    indentWidth: 4,
                    lineWidth: 120,
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should detect invalid quote style", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    quoteStyle: "triple" as any,
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("Invalid quoteStyle: triple. Must be 'single' or 'double'.");
        });

        it("should detect invalid semicolon option", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    semicolons: "sometimes" as any,
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("Invalid semicolons: sometimes. Must be 'always' or 'never'.");
        });

        it("should detect invalid indent width", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    indentWidth: 10,
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("Invalid indentWidth: 10. Must be between 1 and 8.");
        });

        it("should warn about unusual line width", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    lineWidth: 250,
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(true);
            expect(result.warnings[0]).toContain("Unusual lineWidth: 250. Recommended range is 80-120.");
        });

        it("should detect invalid import group order", () => {
            const config: CoreConfig = {
                imports: {
                    enabled: true,
                    groupOrder: ["external", "invalid", "relative"],
                },
            };

            const result = ConfigValidator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("Invalid group in groupOrder: invalid");
        });
    });

    describe("validateOrThrow", () => {
        it("should not throw for valid config", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    quoteStyle: "double",
                },
            };

            expect(() => ConfigValidator.validateOrThrow(config)).not.toThrow();
        });

        it("should throw for invalid config", () => {
            const config: CoreConfig = {
                codeStyle: {
                    enabled: true,
                    quoteStyle: "invalid" as any,
                },
            };

            expect(() => ConfigValidator.validateOrThrow(config)).toThrow("Invalid configuration");
        });
    });

    describe("validateRestrictions", () => {
        it("should return no errors for a valid rule", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                    forbid: [{pattern: "@/**", message: "No internal imports."}],
                },
            ];

            expect(ConfigValidator.validateRestrictions(rules)).toHaveLength(0);
        });

        it("should return an error for an empty files array", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: [],
                    forbid: [{pattern: "@/**", message: "No internal imports."}],
                },
            ];

            const errors = ConfigValidator.validateRestrictions(rules);
            expect(errors).toContain("Invalid restrictions.imports[0]: 'files' must be a non-empty array.");
        });

        it("should return an error for a rule with neither forbid nor allow entries", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                },
            ];

            const errors = ConfigValidator.validateRestrictions(rules);
            expect(errors).toContain("Invalid restrictions.imports[0]: must have at least one of 'forbid' or 'allow'.");
        });

        it("should return no errors for a rule with only an allow list", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                    allow: ["@/ui/**"],
                },
            ];

            expect(ConfigValidator.validateRestrictions(rules)).toHaveLength(0);
        });

        it("should return an error for an empty allow array", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                    allow: [],
                },
            ];

            const errors = ConfigValidator.validateRestrictions(rules);
            expect(errors).toContain("Invalid restrictions.imports[0]: 'allow' must be a non-empty array of strings.");
        });

        it("should return an error for a forbid entry missing message", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                    forbid: [{pattern: "@/**", message: ""}],
                },
            ];

            const errors = ConfigValidator.validateRestrictions(rules);
            expect(errors).toContain("Invalid restrictions.imports[0].forbid[0]: 'message' must be a non-empty string.");
        });

        it("should return an error for a forbid entry with an empty pattern array", () => {
            const rules: ImportRestrictionRule[] = [
                {
                    files: ["app_modules/UIKit/**/*.ts"],
                    forbid: [{pattern: [], message: "No internal imports."}],
                },
            ];

            const errors = ConfigValidator.validateRestrictions(rules);
            expect(errors).toContain("Invalid restrictions.imports[0].forbid[0]: 'pattern' must be a non-empty string or array.");
        });
    });
});
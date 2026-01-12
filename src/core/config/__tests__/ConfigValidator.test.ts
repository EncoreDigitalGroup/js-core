/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../../../config/types";
import { ConfigValidator } from "../ConfigValidator";


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
            expect(result.errors).toContain("Invalid quoteStyle: triple. Must be 'single' or 'double'.");
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
            expect(result.errors).toContain("Invalid semicolons: sometimes. Must be 'always' or 'never'.");
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
            expect(result.errors).toContain("Invalid indentWidth: 10. Must be between 1 and 8.");
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
            expect(result.warnings).toContain("Unusual lineWidth: 250. Recommended range is 80-120.");
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
        it("should warn about deprecated prettier config", () => {

            const config: CoreConfig = {

                prettier: {
                    enabled: true,
},
};

            const result = ConfigValidator.validate(config);

            expect(result.valid).toBe(true);
            expect(result.warnings[0]).toContain("Prettier is deprecated");
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
})

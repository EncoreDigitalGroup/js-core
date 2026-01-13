/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import {ConfigMerger} from "../ConfigMerger";
import {CoreConfig} from "../ConfigTypes";


describe("ConfigMerger", () => {
    describe("merge", () => {
        it("should merge user config with defaults", () => {
            const userConfig: Partial<CoreConfig> = {
                codeStyle: {
                    quoteStyle: "single",
                },
            };

            const result = ConfigMerger.merge(userConfig);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(result.codeStyle?.enabled).toBe(true); // From defaults
            expect(result.codeStyle?.indentWidth).toBe(4); // From defaults
        });
        it("should deep merge nested objects", () => {
            const userConfig: Partial<CoreConfig> = {
                sorting: {
                    classMembers: {
                        groupByVisibility: true,
                    },
                },
            };

            const result = ConfigMerger.merge(userConfig);

            expect(result.sorting?.classMembers?.groupByVisibility).toBe(true);
            expect(result.sorting?.classMembers?.enabled).toBe(true); // From defaults
            expect(result.sorting?.classMembers?.respectDependencies).toBe(true); // From defaults
        });
        it("should replace arrays instead of merging them", () => {
            const userConfig: Partial<CoreConfig> = {
                imports: {
                    groupOrder: ["relative", "external"],
                },
            };

            const result = ConfigMerger.merge(userConfig);

            expect(result.imports?.groupOrder).toEqual(["relative", "external"]);
            expect(result.imports?.groupOrder?.length).toBe(2);
        });
        it("should handle undefined values by keeping defaults", () => {
            const userConfig: Partial<CoreConfig> = {
                codeStyle: {
                    quoteStyle: undefined,
                },
            };

            const result = ConfigMerger.merge(userConfig);

            expect(result.codeStyle?.quoteStyle).toBe("double"); // From defaults
        });
    });
    describe("mergeMultiple", () => {
        it("should merge multiple configs in order", () => {
            const config1: Partial<CoreConfig> = {
                codeStyle: {
                    quoteStyle: "single",
                },
            };

            const config2: Partial<CoreConfig> = {
                codeStyle: {
                    semicolons: "never",
                },
            };

            const config3: Partial<CoreConfig> = {
                codeStyle: {
                    quoteStyle: "double", // Override config1
                },
            };

            const result = ConfigMerger.mergeMultiple(config1, config2, config3);

            expect(result.codeStyle?.quoteStyle).toBe("double"); // From config3
            expect(result.codeStyle?.semicolons).toBe("never"); // From config2
            expect(result.codeStyle?.enabled).toBe(true); // From defaults
        });
        it("should handle empty array", () => {
            const result = ConfigMerger.mergeMultiple();

            expect(result).toBeDefined();
            expect(result.codeStyle?.enabled).toBe(true);
        });
    });
})

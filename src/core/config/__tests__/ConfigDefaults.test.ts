/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { ConfigDefaults } from "../ConfigDefaults";
import { FormatterOrder } from "../ConfigTypes";


describe("ConfigDefaults", () => {
    describe("constants", () => {
        it("should have correct default exclude patterns", () => {
            expect(ConfigDefaults.DEFAULT_EXCLUDE_PATTERNS).toEqual([
                "node_modules/**",
                "dist/**",
                "vendor/**",
                "bin/**"
            ]);
        });

        it("should have correct default TypeScript include patterns", () => {
            expect(ConfigDefaults.DEFAULT_TS_INCLUDE_PATTERNS).toEqual(["**/*.{ts,tsx}"]);
        });

        it("should have correct default JavaScript include patterns", () => {
            expect(ConfigDefaults.DEFAULT_JS_INCLUDE_PATTERNS).toEqual(["**/*.{js,ts,jsx,tsx}"]);
        });

        it("should have correct default index directories", () => {
            expect(ConfigDefaults.DEFAULT_INDEX_DIRECTORIES).toEqual(["src/", "packages/"]);
        });
    });

    describe("pattern getters", () => {
        describe("getDefaultExcludePatterns", () => {
            it("should return a copy of default exclude patterns", () => {
                const patterns = ConfigDefaults.getDefaultExcludePatterns();
                expect(patterns).toEqual(["node_modules/**", "dist/**", "vendor/**", "bin/**"]);
                expect(patterns).not.toBe(ConfigDefaults.DEFAULT_EXCLUDE_PATTERNS);
            });
        });

        describe("getDefaultIncludePatterns", () => {
            it("should return a copy of default TypeScript include patterns", () => {
                const patterns = ConfigDefaults.getDefaultIncludePatterns();
                expect(patterns).toEqual(["**/*.{ts,tsx}"]);
                expect(patterns).not.toBe(ConfigDefaults.DEFAULT_TS_INCLUDE_PATTERNS);
            });
        });

        describe("getDefaultJavaScriptIncludePatterns", () => {
            it("should return a copy of default JavaScript include patterns", () => {
                const patterns = ConfigDefaults.getDefaultJavaScriptIncludePatterns();
                expect(patterns).toEqual(["**/*.{js,ts,jsx,tsx}"]);
                expect(patterns).not.toBe(ConfigDefaults.DEFAULT_JS_INCLUDE_PATTERNS);
            });
        });

        describe("getDefaultIndexDirectories", () => {
            it("should return a copy of default index directories", () => {
                const directories = ConfigDefaults.getDefaultIndexDirectories();
                expect(directories).toEqual(["src/", "packages/"]);
                expect(directories).not.toBe(ConfigDefaults.DEFAULT_INDEX_DIRECTORIES);
            });
        });
    });

    describe("configuration getters", () => {
        describe("getDefaultIndexGenerationConfig", () => {
            it("should return correct default index generation config", () => {
                const config = ConfigDefaults.getDefaultIndexGenerationConfig();

                expect(config.enabled).toBe(true);
                expect(config.directories).toEqual(["src/", "packages/"]);
                expect(config.options.fileExtension).toBe(".ts");
                expect(config.options.indexFileName).toBe("index.ts");
                expect(config.options.recursive).toBe(true);
                expect(config.updateMainIndex).toBe(true);
            });
        });

        describe("getDefaultCodeStyleConfig", () => {
            it("should return correct default code style config", () => {
                const config = ConfigDefaults.getDefaultCodeStyleConfig();

                expect(config.enabled).toBe(true);
                expect(config.quoteStyle).toBe("double");
                expect(config.semicolons).toBe("always");
                expect(config.bracketSpacing).toBe(false);
                expect(config.indentStyle).toBe("space");
                expect(config.indentWidth).toBe(4);
                expect(config.lineWidth).toBe(120);
                expect(config.trailingCommas).toBe("all");
                expect(config.arrowParens).toBe("avoid");
            });
        });

        describe("getDefaultImportConfig", () => {
            it("should return correct default import config", () => {
                const config = ConfigDefaults.getDefaultImportConfig();

                expect(config.enabled).toBe(true);
                expect(config.sortImports).toBe(true);
                expect(config.removeUnused).toBe(true);
                expect(config.removeSideEffects).toBe(false);
                expect(config.groupImports).toBe(true);
                expect(config.groupOrder).toEqual(["external", "internal", "relative"]);
                expect(config.separateGroups).toBe(false);
            });
        });

        describe("getDefaultSortingConfig", () => {
            it("should return correct default sorting config", () => {
                const config = ConfigDefaults.getDefaultSortingConfig();

                expect(config.enabled).toBe(true);
                expect(config.classMembers?.enabled).toBe(true);
                expect(config.classMembers?.groupByVisibility).toBe(false);
                expect(config.classMembers?.respectDependencies).toBe(true);
                expect(config.reactComponents?.enabled).toBe(true);
                expect(config.fileDeclarations?.enabled).toBe(true);
                expect(config.include).toEqual(["**/*.{ts,tsx}"]);
                expect(config.exclude).toEqual(["node_modules/**", "dist/**", "vendor/**", "bin/**"]);
            });
        });

        describe("getDefaultSpacingConfig", () => {
            it("should return correct default spacing config", () => {
                const config = ConfigDefaults.getDefaultSpacingConfig();

                expect(config.enabled).toBe(false);
                expect(config.betweenDeclarations).toBe(true);
                expect(config.beforeReturns).toBe(true);
                expect(config.betweenStatementTypes).toBe(true);
            });
        });

        describe("getDefaultPackageJsonConfig", () => {
            it("should return correct default package.json config", () => {
                const config = ConfigDefaults.getDefaultPackageJsonConfig();

                expect(config.enabled).toBe(true);
                expect(config.indentation).toBe(4);
                expect(config.customSortOrder).toBeDefined();
            });
        });

        describe("getDefaultTsConfigConfig", () => {
            it("should return correct default tsconfig.json config", () => {
                const config = ConfigDefaults.getDefaultTsConfigConfig();

                expect(config.enabled).toBe(true);
                expect(config.indentation).toBe(4);
            });
        });

        describe("getDefaultFormatterOrder", () => {
            it("should return correct default formatter order", () => {
                const order = ConfigDefaults.getDefaultFormatterOrder();

                expect(order).toEqual([
                    FormatterOrder.IndexGeneration,
                    FormatterOrder.CodeStyle,
                    FormatterOrder.ImportOrganization,
                    FormatterOrder.ASTTransformation,
                    FormatterOrder.Spacing
                ]);
                expect(order).toHaveLength(5);
            });
        });
    });

    describe("getDefaultConfig", () => {
        it("should return a complete default configuration", () => {
            const config = ConfigDefaults.getDefaultConfig();

            expect(config).toBeDefined();
            expect(config.indexGeneration).toBeDefined();
            expect(config.codeStyle).toBeDefined();
            expect(config.imports).toBeDefined();
            expect(config.sorting).toBeDefined();
            expect(config.spacing).toBeDefined();
            expect(config.packageJson).toBeDefined();
            expect(config.tsConfig).toBeDefined();
            expect(config.formatterOrder).toBeDefined();
        });

        it("should have all sections enabled by default except spacing", () => {
            const config = ConfigDefaults.getDefaultConfig();

            expect(config.indexGeneration?.enabled).toBe(true);
            expect(config.codeStyle?.enabled).toBe(true);
            expect(config.imports?.enabled).toBe(true);
            expect(config.sorting?.enabled).toBe(true);
            expect(config.spacing?.enabled).toBe(false);
            expect(config.packageJson?.enabled).toBe(true);
            expect(config.tsConfig?.enabled).toBe(true);
        });

        it("should return a new object each time", () => {
            const config1 = ConfigDefaults.getDefaultConfig();
            const config2 = ConfigDefaults.getDefaultConfig();

            expect(config1).not.toBe(config2);
            expect(config1).toEqual(config2);
        });
    });

    describe("utility configurations", () => {
        describe("getMinimalConfig", () => {
            it("should return a minimal configuration", () => {
                const config = ConfigDefaults.getMinimalConfig();

                expect(config.indexGeneration?.enabled).toBe(true);
                expect(config.codeStyle?.enabled).toBe(true);
                expect(config.imports?.enabled).toBe(true);
                expect(config.sorting?.enabled).toBe(true);
                expect(config.spacing?.enabled).toBe(false);
                expect(config.packageJson?.enabled).toBe(true);
                expect(config.tsConfig?.enabled).toBe(true);

                // Should not have detailed configs, just enabled flags
                expect(Object.keys(config.codeStyle!)).toEqual(["enabled"]);
            });
        });

        describe("getDisabledConfig", () => {
            it("should return a configuration with all features disabled", () => {
                const config = ConfigDefaults.getDisabledConfig();

                expect(config.indexGeneration?.enabled).toBe(false);
                expect(config.codeStyle?.enabled).toBe(false);
                expect(config.imports?.enabled).toBe(false);
                expect(config.sorting?.enabled).toBe(false);
                expect(config.spacing?.enabled).toBe(false);
                expect(config.packageJson?.enabled).toBe(false);
                expect(config.tsConfig?.enabled).toBe(false);
            });
        });
    });
});
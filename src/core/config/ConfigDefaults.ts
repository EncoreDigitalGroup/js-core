/*
* Copyright (c) 2025. Encore Digital Group.
* All Rights Reserved.
*/

import { DEFAULT_CLASS_ORDER } from "../";
import { DEFAULT_FILE_ORDER } from "../";
import { DefaultSortOptions } from "../../shared";
import { CoreConfig, FormatterOrder } from "./ConfigTypes";

/** Provides default configuration values for tsfmt */
export class ConfigDefaults {
    /** Get the complete default configuration */
    static getDefaultConfig(): CoreConfig {
        return {
            indexGeneration: this.getDefaultIndexGenerationConfig(),
            codeStyle: this.getDefaultCodeStyleConfig(),
            imports: this.getDefaultImportConfig(),
            sorting: this.getDefaultSortingConfig(),
            spacing: this.getDefaultSpacingConfig(),
            packageJson: this.getDefaultPackageJsonConfig(),
            tsConfig: this.getDefaultTsConfigConfig(),
            formatterOrder: this.getDefaultFormatterOrder(),
            // Backward compatibility - keep old prettier config
            prettier: this.getDefaultPrettierConfig(),
            // Backward compatibility - map to sorting
            sorters: this.getDefaultSortingConfig(),
        };
    }

    /** Get default index generation configuration */
    static getDefaultIndexGenerationConfig() {
        return {
            enabled: true,
            directories: ["src/", "packages/"],
            options: {
                fileExtension: ".ts",
                indexFileName: "index.ts",
                recursive: true
            },
            updateMainIndex: true,
        };
    }

    /** Get default code style configuration */
    static getDefaultCodeStyleConfig() {
        return {
            enabled: true,
            quoteStyle: "double" as const,
            semicolons: "always" as const,
            bracketSpacing: false,
            indentStyle: "space" as const,
            indentWidth: 4,
            lineWidth: 120,
            trailingCommas: "all" as const,
            arrowParens: "avoid" as const,
        };
    }

    /** Get default import configuration */
    static getDefaultImportConfig() {
        return {
            enabled: true,
            sortImports: true,
            removeUnused: true,
            removeSideEffects: false,
            groupImports: true,
            groupOrder: ["external", "internal", "relative"],
            separateGroups: false,
        };
    }

    /** Get default sorting configuration */
    static getDefaultSortingConfig() {
        return {
            enabled: true,
            classMembers: {
                enabled: true,
                order: DEFAULT_CLASS_ORDER,
                groupByVisibility: false,
                respectDependencies: true,
            },
            reactComponents: {
                enabled: true,
                order: DEFAULT_CLASS_ORDER,
                groupByVisibility: false,
                respectDependencies: true,
            },
            fileDeclarations: {
                enabled: true,
                order: DEFAULT_FILE_ORDER,
                respectDependencies: true,
            },
            include: ["**/*.{ts,tsx}"],
            exclude: ["node_modules/**", "dist/**", "vendor/**", "bin/**"],
        };
    }

    /** Get default spacing configuration */
    static getDefaultSpacingConfig() {
        return {
            enabled: false,
            betweenDeclarations: true,
            beforeReturns: true,
            betweenStatementTypes: true,
        };
    }

    /** Get default package.json configuration */
    static getDefaultPackageJsonConfig() {
        return {
            enabled: true,
            customSortOrder: DefaultSortOptions.customSortOrder,
            indentation: 4,
        };
    }

    /** Get default tsconfig.json configuration */
    static getDefaultTsConfigConfig() {
        return {
            enabled: true,
            indentation: 4,
        };
    }

    /** Get default formatter order */
    static getDefaultFormatterOrder(): FormatterOrder[] {
        return [
            FormatterOrder.IndexGeneration,
            FormatterOrder.CodeStyle,
            FormatterOrder.ImportOrganization,
            FormatterOrder.ASTTransformation,
            FormatterOrder.Spacing
        ];
    }

    /** Get default Prettier configuration (deprecated) */
    static getDefaultPrettierConfig() {
        return {
            enabled: false, // Disabled by default - use codeStyle instead
            skipIfConfigExists: true,
            options: {
                plugins: ["@trivago/prettier-plugin-sort-imports"],
                bracketSpacing: false,
                trailingComma: "all" as const,
                arrowParens: "avoid" as const,
                tabWidth: 4,
                editorconfig: true,
                useTabs: false,
                printWidth: 120,
                importOrderSeparation: true,
                singleQuote: false,
                semi: true,
            },
            include: ["**/*.{js,ts,jsx,tsx}"],
            exclude: ["node_modules/**", "dist/**", "vendor/**", "bin/**"],
        };
    }

    /** Get default exclude patterns for file processing */
    static getDefaultExcludePatterns(): string[] {
        return ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
    }

    /** Get default include patterns for TypeScript files */
    static getDefaultIncludePatterns(): string[] {
        return ["**/*.{ts,tsx}"];
    }

    /** Get default include patterns for JavaScript files */
    static getDefaultJavaScriptIncludePatterns(): string[] {
        return ["**/*.{js,ts,jsx,tsx}"];
    }

    /** Get default directories for index generation */
    static getDefaultIndexDirectories(): string[] {
        return ["src/", "packages/"];
    }

    /** Create a minimal configuration with only enabled features */
    static getMinimalConfig(): CoreConfig {
        return {
            indexGeneration: { enabled: true },
            codeStyle: { enabled: true },
            imports: { enabled: true },
            sorting: { enabled: true },
            spacing: { enabled: false },
            packageJson: { enabled: true },
            tsConfig: { enabled: true },
        };
    }

    /** Create a configuration with all features disabled */
    static getDisabledConfig(): CoreConfig {
        return {
            indexGeneration: { enabled: false },
            codeStyle: { enabled: false },
            imports: { enabled: false },
            sorting: { enabled: false },
            spacing: { enabled: false },
            packageJson: { enabled: false },
            tsConfig: { enabled: false },
        };
    }
}

/** Export the default configuration instance for backward compatibility */
export const defaultConfig = ConfigDefaults.getDefaultConfig();
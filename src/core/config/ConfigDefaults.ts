/*
* Copyright (c) 2025. Encore Digital Group.
* All Rights Reserved.
*/

import {DEFAULT_CLASS_ORDER} from "../";
import {DEFAULT_FILE_ORDER} from "../";
import {DefaultSortOptions} from "../../shared";
import {CoreConfig, FormatterOrder, ConfigTypes} from "./ConfigTypes";

/** Provides default configuration values for tsfmt */
export class ConfigDefaults {
    /** Default file patterns */
    static readonly DEFAULT_EXCLUDE_PATTERNS = ["node_modules/**", "dist/**", "vendor/**", "bin/**"] as const;
    static readonly DEFAULT_TS_INCLUDE_PATTERNS = ["**/*.{ts,tsx}"] as const;
    static readonly DEFAULT_JS_INCLUDE_PATTERNS = ["**/*.{js,ts,jsx,tsx}"] as const;
    static readonly DEFAULT_INDEX_DIRECTORIES = ["src/", "packages/"] as const;

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
        };
    }

    /** Get default index generation configuration */
    static getDefaultIndexGenerationConfig() {
        return {
            enabled: true,
            directories: this.getDefaultIndexDirectories(),
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
            groupOrder: ConfigTypes.getImportGroupOptions(),
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
            include: this.getDefaultIncludePatterns(),
            exclude: this.getDefaultExcludePatterns(),
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

    /** Get default exclude patterns for file processing */
    static getDefaultExcludePatterns(): string[] {
        return [...this.DEFAULT_EXCLUDE_PATTERNS];
    }

    /** Get default include patterns for TypeScript files */
    static getDefaultIncludePatterns(): string[] {
        return [...this.DEFAULT_TS_INCLUDE_PATTERNS];
    }

    /** Get default include patterns for JavaScript files */
    static getDefaultJavaScriptIncludePatterns(): string[] {
        return [...this.DEFAULT_JS_INCLUDE_PATTERNS];
    }

    /** Get default directories for index generation */
    static getDefaultIndexDirectories(): string[] {
        return [...this.DEFAULT_INDEX_DIRECTORIES];
    }
}
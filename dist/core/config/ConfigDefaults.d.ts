import { CoreConfig, FormatterOrder } from "./ConfigTypes";
export declare class ConfigDefaults {
    static readonly DEFAULT_EXCLUDE_PATTERNS: readonly ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
    static readonly DEFAULT_INDEX_DIRECTORIES: readonly ["src/", "packages/"];
    static readonly DEFAULT_JS_INCLUDE_PATTERNS: readonly ["**/*.{js,ts,jsx,tsx}"];
    static readonly DEFAULT_TS_INCLUDE_PATTERNS: readonly ["**/*.{ts,tsx}"];
    static getDefaultCodeStyleConfig(): {
        enabled: boolean;
        quoteStyle: "double";
        semicolons: "always";
        bracketSpacing: boolean;
        indentStyle: "space";
        indentWidth: number;
        lineWidth: number;
        trailingCommas: "all";
        arrowParens: "avoid";
    };
    static getDefaultIndexDirectories(): string[];
    static getDefaultIndexGenerationConfig(): {
        enabled: boolean;
        directories: string[];
        options: {
            fileExtension: string;
            indexFileName: string;
            recursive: boolean;
        };
        updateMainIndex: boolean;
    };
    static getDefaultImportConfig(): {
        enabled: boolean;
        sortImports: boolean;
        removeUnused: boolean;
        removeSideEffects: boolean;
        groupImports: boolean;
        groupOrder: string[];
        separateGroups: boolean;
    };
    static getDefaultIncludePatterns(): string[];
    static getDefaultExcludePatterns(): string[];
    static getDefaultSortingConfig(): {
        enabled: boolean;
        classMembers: {
            enabled: boolean;
            order: import("../").MemberType[];
            groupByVisibility: boolean;
            respectDependencies: boolean;
        };
        reactComponents: {
            enabled: boolean;
            order: import("../").MemberType[];
            groupByVisibility: boolean;
            respectDependencies: boolean;
        };
        fileDeclarations: {
            enabled: boolean;
            order: import("../").DeclarationType[];
            respectDependencies: boolean;
        };
        include: string[];
        exclude: string[];
    };
    static getDefaultSpacingConfig(): {
        enabled: boolean;
        betweenDeclarations: boolean;
        beforeReturns: boolean;
        betweenStatementTypes: boolean;
    };
    static getDefaultPackageJsonConfig(): {
        enabled: boolean;
        customSortOrder: string[] | undefined;
        indentation: number;
    };
    static getDefaultTsConfigConfig(): {
        enabled: boolean;
        indentation: number;
    };
    static getDefaultFormatterOrder(): FormatterOrder[];
    static getDefaultConfig(): CoreConfig;
    static getDefaultJavaScriptIncludePatterns(): string[];
    static getDisabledConfig(): CoreConfig;
    static getMinimalConfig(): CoreConfig;
}

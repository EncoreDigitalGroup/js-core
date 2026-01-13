/*
* Copyright (c) 2025. Encore Digital Group.
* All Rights Reserved.
*/

import { MemberType } from "../";
import { DeclarationType } from "../";
import { IndexGenerationConfig } from "../";


/** Configuration for class member sorting */
export interface ClassMemberConfig {
    /** Whether to sort class members (default: true) */
    enabled?: boolean;

    /** Custom order for class members */
    order?: MemberType[];

    /** Whether to group members by visibility (public, protected, private) (default: false) */
    groupByVisibility?: boolean;

    /** Whether to respect dependencies between members (default: true) */
    respectDependencies?: boolean;
}

/** Configuration for code style formatting */
export interface CodeStyleConfig {
    /** Whether to run code style formatting (default: true) */
    enabled?: boolean;

    /** Quote style for strings (default: 'double') */
    quoteStyle?: "single" | "double";

    /** Semicolon usage (default: 'always') */
    semicolons?: "always" | "never";

    /** Bracket spacing in object literals (default: false) */
    bracketSpacing?: boolean;

    /** Indentation style (default: 'space') */
    indentStyle?: "tab" | "space";

    /** Indentation width (default: 4) */
    indentWidth?: number;

    /** Maximum line width (default: 120) */
    lineWidth?: number;

    /** Trailing commas (default: 'all') */
    trailingCommas?: "none" | "es5" | "all";

    /** Arrow function parentheses (default: 'avoid') */
    arrowParens?: "always" | "avoid";
}

/** Configuration for import organization */
export interface ImportConfig {
    /** Whether to organize imports (default: true) */
    enabled?: boolean;

    /** Sort imports alphabetically (default: true) */
    sortImports?: boolean;

    /** Remove unused imports (default: true) */
    removeUnused?: boolean;

    /** Remove side-effect imports like "import './styles.css'" (default: false) */
    removeSideEffects?: boolean;

    /** Group imports by type (default: true) */
    groupImports?: boolean;

    /** Custom group order (default: ["external", "internal", "relative"]) */
    groupOrder?: string[];

    /** Add blank lines between import groups (default: false) */
    separateGroups?: boolean;
}

/** Configuration for React component member sorting */
export interface ReactComponentConfig {
    /** Whether to sort React component members (default: true) */
    enabled?: boolean;

    /** Custom order for React component members */
    order?: MemberType[];

    /** Whether to group members by visibility (public, protected, private) (default: false) */
    groupByVisibility?: boolean;

    /** Whether to respect dependencies between members (default: true) */
    respectDependencies?: boolean;
}

/** Configuration for file-level declaration sorting */
export interface FileDeclarationConfig {
    /** Whether to sort file-level declarations (default: true) */
    enabled?: boolean;

    /** Custom order for file-level declarations */
    order?: DeclarationType[];

    /** Whether to respect dependencies between declarations (default: true) */
    respectDependencies?: boolean;
}

/** Configuration for AST-based sorting (class members, file declarations) */
export interface SortingConfig {
    /** Whether to enable AST-based sorting (default: true) */
    enabled?: boolean;

    /** Configuration for class member sorting */
    classMembers?: ClassMemberConfig;

    /** Configuration for React component member sorting */
    reactComponents?: ReactComponentConfig;

    /** Configuration for file-level declaration sorting */
    fileDeclarations?: FileDeclarationConfig;

    /** File patterns to include (default: ["**\/*.{ts,tsx}"]) */
    include?: string[];

    /** Directories to exclude (default: ["node_modules/**", "dist/**", "vendor/**", "bin/**"]) */
    exclude?: string[];
}

/** Configuration for spacing rules */
export interface SpacingConfig {
    /** Whether to apply spacing rules (default: true) */
    enabled?: boolean;

    /** Add blank lines between declarations with different keywords (default: true) */
    betweenDeclarations?: boolean;

    /** Add blank lines before return statements (default: true) */
    beforeReturns?: boolean;

    /** Add blank lines between different statement types (default: true) */
    betweenStatementTypes?: boolean;
}

/** Configuration for package.json sorting */
export interface PackageJsonConfig {
    /** Whether to sort package.json (default: true) */
    enabled?: boolean;

    /** Custom sort order for package.json fields */
    customSortOrder?: string[];

    /** JSON indentation (default: 4) */
    indentation?: number;
}

/** Configuration for tsconfig.json sorting */
export interface TsConfigConfig {
    /** Whether to sort tsconfig.json (default: true) */
    enabled?: boolean;

    /** JSON indentation (default: 4) */
    indentation?: number;
}

/** Represents the execution order of formatters in the pipeline */
export enum FormatterOrder {
    IndexGeneration = "IndexGeneration",
    CodeStyle = "CodeStyle",
    ImportOrganization = "ImportOrganization",
    ASTTransformation = "ASTTransformation",
    Spacing = "Spacing"
}


/** Main configuration interface for tsfmt */
export interface CoreConfig {
    /** Configuration for automatic index.ts file generation */
    indexGeneration?: IndexGenerationConfig;

    /** Configuration for code style formatting (quotes, semicolons, spacing) */
    codeStyle?: CodeStyleConfig;

    /** Configuration for import organization */
    imports?: ImportConfig;

    /** Configuration for AST-based sorting (class members, file declarations) */
    sorting?: SortingConfig;

    /** Configuration for blank line spacing rules */
    spacing?: SpacingConfig;

    /** Configuration for package.json sorting */
    packageJson?: PackageJsonConfig;

    /** Configuration for tsconfig.json sorting */
    tsConfig?: TsConfigConfig;

    /** Custom order for formatter execution (default: IndexGeneration, CodeStyle, ImportOrganization, ASTTransformation, Spacing) */
    formatterOrder?: FormatterOrder[];
}

/** Configuration type definitions and utilities */
export class ConfigTypes {
    /** Get all available arrow parentheses options */
    static getArrowParenOptions(): Array<"always" | "avoid"> {
        return ["always", "avoid"];
    }

    /** Get all formatter order options */
    static getFormatterOrderOptions(): FormatterOrder[] {
        return Object.values(FormatterOrder);
    }

    /** Get all available import group options */
    static getImportGroupOptions(): string[] {
        return ["external", "internal", "relative"];
    }

    /** Get all available indent style options */
    static getIndentStyleOptions(): Array<"tab" | "space"> {
        return ["tab", "space"];
    }

    /** Get all available quote style options */
    static getQuoteStyleOptions(): Array<"single" | "double"> {
        return ["single", "double"];
    }

    /** Get all available semicolon options */
    static getSemicolonOptions(): Array<"always" | "never"> {
        return ["always", "never"];
    }

    /** Get all available trailing comma options */
    static getTrailingCommaOptions(): Array<"none" | "es5" | "all"> {
        return ["none", "es5", "all"];
    }

    /** Check if a line width is in recommended range */
    static isRecommendedLineWidth(width: number): boolean {
        return width >= 80 && width <= 120;
    }

    /** Validate an arrow parentheses option */
    static isValidArrowParenOption(option: string): option is "always" | "avoid" {
        return this.getArrowParenOptions().includes(option as any);
    }

    /** Validate an indent style option */
    static isValidIndentStyle(style: string): style is "tab" | "space" {
        return this.getIndentStyleOptions().includes(style as any);
    }

    /** Check if an indent width is valid */
    static isValidIndentWidth(width: number): boolean {
        return width >= 1 && width <= 8;
    }

    /** Validate a quote style option */
    static isValidQuoteStyle(style: string): style is "single" | "double" {
        return this.getQuoteStyleOptions().includes(style as any);
    }

    /** Validate a semicolon option */
    static isValidSemicolonOption(option: string): option is "always" | "never" {
        return this.getSemicolonOptions().includes(option as any);
    }

    /** Validate a trailing comma option */
    static isValidTrailingCommaOption(option: string): option is "none" | "es5" | "all" {
        return this.getTrailingCommaOptions().includes(option as any);
    }
}
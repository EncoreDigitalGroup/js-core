/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */

/*
 * These enums and the index-generation config interface live here, in the dependency-free config
 * module, rather than in the rule files that use them. That keeps the public type surface
 * (`tsfmt` + these config types) free of any transitive import of `ts-morph`/`typescript`/
 * `reflect-metadata`, which are dev-only dependencies absent from a consumer install. The AST and
 * index-generation rules import these definitions from here.
 */
import type {PresetName} from "./presets";

/** Types of class members, used to order class-member sorting. */
export enum MemberType {
    StaticProperty = "static_property",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor"
}

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

    /** Bracket spacing in object type literals, e.g. `{ a: string }` (default: true) */
    typeBracketSpacing?: boolean;

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

    /** Space before the `/>` of a self-closing JSX element (default: false) */
    jsxSelfClosingSpace?: boolean;
}

/** Options for configuring how index files are generated */
export interface IndexGenerationOptions {
    /** File extension to match (e.g., ".tsx", ".ts") */
    fileExtension: string;

    /** Name of the index file to generate (e.g., "index.tsx", "index.ts") */
    indexFileName: string;

    /** Whether to recursively scan subdirectories */
    recursive: boolean;
}

/** Configuration for index file generation */
export interface IndexGenerationConfig {
    /** Whether to generate index files (default: false) */
    enabled?: boolean;

    /** Directories to process for index generation */
    directories?: string[];

    /** Directories to always skip, even if listed in directories (takes priority) */
    skipDirectories?: string[];

    /** Default options for index generation */
    options?: Partial<IndexGenerationOptions>;

    /** Whether to update the main src/index.ts file (default: true) */
    updateMainIndex?: boolean;
}

/** Configuration for import organization */
export interface ImportConfig {
    /** Whether to organize imports (default: true) */
    enabled?: boolean;

    /** Sort imports alphabetically (default: true) */
    sortImports?: boolean;

    /** Merge multiple imports from the same module into one statement (default: true) */
    mergeDuplicates?: boolean;

    /**
     * Rewrite a deep relative import to the shortest tsconfig-path alias whose barrel provably
     * re-exports the same symbols (default: true). Reads tsconfig paths and barrel files from disk.
     */
    shortenPaths?: boolean;

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

/** Types of top-level declarations in a file, used to order file-level declaration sorting. */
export enum DeclarationType {
    Interface = "interface",
    TypeAlias = "type_alias",
    Enum = "enum",
    HelperFunction = "helper_function",
    HelperVariable = "helper_variable",
    ExportedFunction = "exported_function",
    ExportedVariable = "exported_variable",
    ExportedClass = "exported_class",
    DefaultExport = "default_export",
    Other = "other"
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

/** Configuration for which files a run formats, resolved via glob. */
export interface PathsConfig {
    /** Glob patterns of files to format. Empty means "scan everything" (the `tsfmt .` behavior). Default: []. */
    include?: string[];

    /** Glob patterns to skip during a config-driven scan. Overridden by include, and bypassed entirely when paths are passed on the CLI. Default: []. */
    exclude?: string[];
}

/** A single forbidden-import entry: one or more module-specifier globs plus the message shown when matched. */
export interface ImportRestrictionEntry {
    /** Module-specifier glob(s) to forbid, e.g. "@/**" or ["app_modules/**", "**\/app_modules/**"]. */
    pattern: string | string[];

    /** Message printed when an import matches this entry. */
    message: string;
}

/** One import restriction rule: which files it applies to, and what they may not (forbid) or may only (allow) import. */
export interface ImportRestrictionRule {
    /** File globs (relative to the config directory) this rule applies to, e.g. ["app_modules/UIKit/resources/**\/*.{ts,tsx}"]. */
    files: string[];

    /** Deny-list: imports matching any entry's pattern are violations. */
    forbid?: ImportRestrictionEntry[];

    /** Allow-list: an import whose specifier matches none of these globs is a violation. */
    allow?: string[];

    /** Message shown for allow-list violations (falls back to a generated message when omitted). */
    message?: string;
}

/** Optional business-rule restrictions. Absent by default — tsfmt imposes no restrictions unless a project opts in. */
export interface RestrictionsConfig {
    /** Import restriction rules. Absent or empty means the gate does nothing. */
    imports?: ImportRestrictionRule[];
}

export interface ParallelConfig {
    /** Maximum number of formatter workers to start (default: 3). */
    workers?: number;
}

/** Represents the execution order of formatters in the pipeline */
export enum FormatterOrder {
    CodeStyle = "CodeStyle",
    ImportOrganization = "ImportOrganization",
    ASTTransformation = "ASTTransformation",
    Spacing = "Spacing"
}

/** Main configuration interface for tsfmt */
export interface CoreConfig {
    /**
     * Name of a built-in preset to load beneath your overrides (default: none). Preset values apply over
     * tsfmt defaults; your own keys override the preset.
     */
    preset?: PresetName;

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

    /**
     * Which files a run formats, resolved via glob. `paths.include`/`paths.exclude` default to empty; empty means the
     * full-cwd scan (`tsfmt .`). CLI positional paths replace `paths.include` in memory for the run.
     */
    paths?: PathsConfig;

    /**
     * Optional business-rule restrictions (e.g. forbidden import patterns), enforced by a read-only gate that runs
     * before formatting. Absent by default — tsfmt imposes no restrictions unless a project opts in.
     */
    restrictions?: RestrictionsConfig;

    /** Configuration for the `--parallel` worker pool. */
    parallel?: ParallelConfig;

    /** Custom order for per-file formatter execution (default: CodeStyle, ImportOrganization, ASTTransformation, Spacing) */
    formatterOrder?: FormatterOrder[];

    /**
     * Explicit opt-out: skip formatting for React component files (.tsx and .jsx) entirely
     * (default: false — unset is treated as `false`, so `.tsx`/`.jsx` files are formatted).
     * The ts-morph parse-once pipeline formats `.tsx`/`.jsx` safely, so this key is no longer a
     * corruption guard against clobbering those files — it exists purely for callers who want to
     * exclude React files from formatting for other reasons.
     */
    skipReactFiles?: boolean;
}

/** Default maximum number of formatter workers. */
export const DEFAULT_PARALLEL_WORKERS = 3;

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
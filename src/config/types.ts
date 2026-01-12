/*
* Copyright (c) 2025. Encore Digital Group.
* All Rights Reserved.
*/

import { DEFAULT_CLASS_ORDER, MemberType } from "../core/formatters/rules/ast/ClassMemberSortingRule";
import { DeclarationType, DEFAULT_FILE_ORDER } from "../core/formatters/rules/ast/FileDeclarationSortingRule";
import { IndexGenerationConfig } from "../core/formatters/rules/index/IndexGenerationRule";
import { DefaultSortOptions } from "../shared/types";


/**
* Configuration for class member sorting
*/

export interface ClassMemberConfig {
    /**
    * Whether to sort class members (default: true)
    */
    enabled?: boolean;

    /**
    * Custom order for class members
    */
    order?: MemberType[];

    /**
    * Whether to group members by visibility (public, protected, private) (default: false)
    */
    groupByVisibility?: boolean;

    /**
    * Whether to respect dependencies between members (default: true)
    */
    respectDependencies?: boolean;
}

/**
* Configuration for code style formatting
*/

export interface CodeStyleConfig {
    /**
    * Whether to run code style formatting (default: true)
    */
    enabled?: boolean;

    /**
    * Quote style for strings (default: 'double')
    */
    quoteStyle?: "single" | "double";

    /**
    * Semicolon usage (default: 'always')
    */
    semicolons?: "always" | "never";

    /**
    * Bracket spacing in object literals (default: false)
    */
    bracketSpacing?: boolean;

    /**
    * Indentation style (default: 'space')
    */
    indentStyle?: "tab" | "space";

    /**
    * Indentation width (default: 4)
    */
    indentWidth?: number;

    /**
    * Maximum line width (default: 120)
    */
    lineWidth?: number;

    /**
    * Trailing commas (default: 'all')
    */
    trailingCommas?: "none" | "es5" | "all";

    /**
    * Arrow function parentheses (default: 'avoid')
    */
    arrowParens?: "always" | "avoid";
}

/**
* Configuration for import organization
*/

export interface ImportConfig {
    /**
    * Whether to organize imports (default: true)
    */
    enabled?: boolean;

    /**
    * Sort imports alphabetically (default: true)
    */
    sortImports?: boolean;

    /**
    * Remove unused imports (default: true)
    */
    removeUnused?: boolean;

    /**
    * Remove side-effect imports like "import './styles.css'" (default: false)
    */
    removeSideEffects?: boolean;

    /**
    * Group imports by type (default: true)
    */
    groupImports?: boolean;

    /**
    * Custom group order (default: ["external", "internal", "relative"])
    */
    groupOrder?: string[];

    /**
    * Add blank lines between import groups (default: false)
    */
    separateGroups?: boolean;
}

/**
* Configuration for React component member sorting
*/

export interface ReactComponentConfig {
    /**
    * Whether to sort React component members (default: true)
    */
    enabled?: boolean;

    /**
    * Custom order for React component members
    */
    order?: MemberType[];

    /**
    * Whether to group members by visibility (public, protected, private) (default: false)
    */
    groupByVisibility?: boolean;

    /**
    * Whether to respect dependencies between members (default: true)
    */
    respectDependencies?: boolean;
}

/**
* Configuration for file-level declaration sorting
*/

export interface FileDeclarationConfig {
    /**
    * Whether to sort file-level declarations (default: true)
    */
    enabled?: boolean;

    /**
    * Custom order for file-level declarations
    */
    order?: DeclarationType[];

    /**
    * Whether to respect dependencies between declarations (default: true)
    */
    respectDependencies?: boolean;
}

/**
* Configuration for AST-based sorting (class members, file declarations)
*/

export interface SortingConfig {
    /**
    * Whether to enable AST-based sorting (default: true)
    */
    enabled?: boolean;

    /**
    * Configuration for class member sorting
    */
    classMembers?: ClassMemberConfig;

    /**
    * Configuration for React component member sorting
    */
    reactComponents?: ReactComponentConfig;

    /**
    * Configuration for file-level declaration sorting
    */
    fileDeclarations?: FileDeclarationConfig;

    /**
    * File patterns to include (default: ["**\/*.{ts,tsx}"])
    */
    include?: string[];

    /**
    * Directories to exclude (default: ["node_modules/**", "dist/**", "vendor/**", "bin/**"])
    */
    exclude?: string[];
}

/**
* Configuration for spacing rules
*/

export interface SpacingConfig {
    /**
    * Whether to apply spacing rules (default: true)
    */
    enabled?: boolean;

    /**
    * Add blank lines between declarations with different keywords (default: true)
    */
    betweenDeclarations?: boolean;

    /**
    * Add blank lines before return statements (default: true)
    */
    beforeReturns?: boolean;

    /**
    * Add blank lines between different statement types (default: true)
    */
    betweenStatementTypes?: boolean;
}

/**
* Configuration for package.json sorting
*/

export interface PackageJsonConfig {
    /**
    * Whether to sort package.json (default: true)
    */
    enabled?: boolean;

    /**
    * Custom sort order for package.json fields
    */
    customSortOrder?: string[];

    /**
    * JSON indentation (default: 4)
    */
    indentation?: number;
}

/**
* Configuration for tsconfig.json sorting
*/

export interface TsConfigConfig {
    /**
    * Whether to sort tsconfig.json (default: true)
    */
    enabled?: boolean;

    /**
    * JSON indentation (default: 4)
    */
    indentation?: number;
}

/**
* Represents the execution order of formatters in the pipeline
*/

export enum FormatterOrder {
    IndexGeneration = "IndexGeneration",
    CodeStyle = "CodeStyle",
    ImportOrganization = "ImportOrganization",
    ASTTransformation = "ASTTransformation",
    Spacing = "Spacing"
}

/**
* @deprecated Use SortingConfig instead
*/

export interface SortersConfig extends SortingConfig {
}

/**
* Configuration for Prettier formatting
*/

export interface PrettierConfig {
    /**
    * Whether to run Prettier (default: true)
    */
    enabled?: boolean;

    /**
    * Whether to skip Prettier if a config file exists in the project (default: true)
    */
    skipIfConfigExists?: boolean;

    /**
    * Prettier options to use when no config file exists
    */
    options?: {
        plugins?: string[];
        bracketSpacing?: boolean;
        trailingComma?: "none" | "es5" | "all";
        arrowParens?: "always" | "avoid";
        tabWidth?: number;
        editorconfig?: boolean;
        useTabs?: boolean;
        printWidth?: number;
        importOrderSeparation?: boolean;
        singleQuote?: boolean;
        semi?: boolean;
        [key: string]: any;
    };

    /**
    * File patterns to include (default: ["**\/*.{js,ts,jsx,tsx}"])
    */
    include?: string[];

    /**
    * Directories to exclude (default: ["node_modules/**", "dist/**", "vendor/**", "bin/**"])
    */
    exclude?: string[];
}

/**
* Main configuration interface for @encoredigitalgroup/core
*/

export interface CoreConfig {
    /**
    * Configuration for automatic index.ts file generation
    */
    indexGeneration?: IndexGenerationConfig;

    /**
    * Configuration for code style formatting (quotes, semicolons, spacing)
    */
    codeStyle?: CodeStyleConfig;

    /**
    * Configuration for import organization
    */
    imports?: ImportConfig;

    /**
    * Configuration for AST-based sorting (class members, file declarations)
    */
    sorting?: SortingConfig;

    /**
    * Configuration for blank line spacing rules
    */
    spacing?: SpacingConfig;

    /**
    * Configuration for package.json sorting
    */
    packageJson?: PackageJsonConfig;

    /**
    * Configuration for tsconfig.json sorting
    */
    tsConfig?: TsConfigConfig;

    /**
    * Custom order for formatter execution (default: IndexGeneration, CodeStyle, ImportOrganization, ASTTransformation, Spacing)
    */
    formatterOrder?: FormatterOrder[];

    /**
    * @deprecated Use 'sorting' instead
    * Configuration for class member and file-level declaration sorting
    */
    sorters?: SortersConfig;

    /**
    * @deprecated Prettier is no longer used - use 'codeStyle' instead
    * Configuration for Prettier formatting
    */
    prettier?: PrettierConfig;
}

/**
* Deep merges two configuration objects
*/

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = {...target};

    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === "object" &&

                source[key] !== null &&
                !Array.isArray(source[key]) &&
                typeof result[key] === "object" &&
                result[key] !== null &&
                !Array.isArray(result[key])) {
                result[key] = deepMerge(result[key] as any, source[key] as any);
            } else {
                result[key] = source[key] as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

/**
* Default configuration
*/

export const defaultConfig: CoreConfig = {
    indexGeneration: {
        enabled: true,
        directories: ["src/", "packages/"],
        options: {
            fileExtension: ".ts",
            indexFileName: "index.ts",
            recursive: true
},
        updateMainIndex: true,
},
    codeStyle: {
        enabled: true,
        quoteStyle: "double",
        semicolons: "always",
        bracketSpacing: false,
        indentStyle: "space",
        indentWidth: 4,
        lineWidth: 120,
        trailingCommas: "all",
        arrowParens: "avoid",
},
    imports: {
        enabled: true,
        sortImports: true,
        removeUnused: true,
        removeSideEffects: false,
        groupImports: true,
        groupOrder: ["external", "internal", "relative"],
        separateGroups: false,
},
    sorting: {
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
},
    spacing: {
        enabled: false,
        betweenDeclarations: true,
        beforeReturns: true,
        betweenStatementTypes: true,
},
    packageJson: {
        enabled: true,
        customSortOrder: DefaultSortOptions.customSortOrder,
        indentation: 4,
},
    tsConfig: {
        enabled: true,
        indentation: 4,
},
    // Backward compatibility - keep old prettier config
    prettier: {
        enabled: false, // Disabled by default - use codeStyle instead
        skipIfConfigExists: true,
        options: {
            plugins: ["@trivago/prettier-plugin-sort-imports"],
            bracketSpacing: false,
            trailingComma: "all",
            arrowParens: "avoid",
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
},
    // Backward compatibility - map to sorting
    sorters: {
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
},
};

/**
* Merges user configuration with default configuration
*/

export function mergeConfig(userConfig: Partial<CoreConfig>): CoreConfig {
    return deepMerge(defaultConfig, userConfig);
}
/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {DeclarationType, DEFAULT_FILE_ORDER} from "../formatters/file";
import {ReactMemberType, DEFAULT_REACT_ORDER} from "../formatters/react";
import {MemberType, DEFAULT_CLASS_ORDER} from "../shared/classMemberTypes";
import {DefaultSortOptions} from "../shared/types";

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
    order?: ReactMemberType[];
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
 * Configuration for class member and file-level declaration sorting
 */
export interface SortersConfig {
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
 * Main configuration interface for @encoredigitalgroup/core
 */
export interface CoreConfig {
    /**
     * Enable debug logging (default: false)
     */
    debug?: boolean;
    /**
     * Configuration for Prettier formatting
     */
    prettier?: PrettierConfig;
    /**
     * Configuration for package.json sorting
     */
    packageJson?: PackageJsonConfig;
    /**
     * Configuration for tsconfig.json sorting
     */
    tsConfig?: TsConfigConfig;
    /**
     * Configuration for class member and file-level declaration sorting
     */
    sorters?: SortersConfig;
}

/**
 * Deep merges two configuration objects
 */
function __deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = {...target};
    for (const key in source) {
        if (source[key] !== undefined) {
            if (
                typeof source[key] === "object" &&
                source[key] !== null &&
                !Array.isArray(source[key]) &&
                typeof result[key] === "object" &&
                result[key] !== null &&
                !Array.isArray(result[key])
            ) {
                result[key] = __deepMerge(result[key] as any, source[key] as any);
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
    debug: false,
    prettier: {
        enabled: true,
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
    packageJson: {
        enabled: true,
        customSortOrder: DefaultSortOptions.customSortOrder,
        indentation: 4,
    },
    tsConfig: {
        enabled: true,
        indentation: 4,
    },
    sorters: {
        classMembers: {
            enabled: true,
            order: DEFAULT_CLASS_ORDER,
            groupByVisibility: false,
            respectDependencies: true,
        },
        reactComponents: {
            enabled: true,
            order: DEFAULT_REACT_ORDER,
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
export function __mergeConfig(userConfig: Partial<CoreConfig>): CoreConfig {
    return __deepMerge(defaultConfig, userConfig);
}

/**
 * Configure the tool with type-safe autocomplete
 *
 * Use this function in your core.config.ts file to get full TypeScript autocomplete
 * without needing type assertions.
 *
 * @example
 * ```ts
 * import { configure } from '@encoredigitalgroup/core';
 *
 * export default configure({
 *   debug: true,
 *   prettier: {
 *     enabled: true
 *   }
 * });
 * ```
 */

export function configure(config: Partial<CoreConfig>): CoreConfig {
    return __mergeConfig(config);
}

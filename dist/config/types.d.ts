import { DeclarationType } from "../formatters/file";
import { ReactMemberType } from "../formatters/react";
import { MemberType } from "../shared/classMemberTypes";
export interface ClassMemberConfig {
    enabled?: boolean;
    order?: MemberType[];
    groupByVisibility?: boolean;
    respectDependencies?: boolean;
}
export interface PrettierConfig {
    enabled?: boolean;
    skipIfConfigExists?: boolean;
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
    include?: string[];
    exclude?: string[];
}
export interface PackageJsonConfig {
    enabled?: boolean;
    customSortOrder?: string[];
    indentation?: number;
}
export interface TsConfigConfig {
    enabled?: boolean;
    indentation?: number;
}
export interface ReactComponentConfig {
    enabled?: boolean;
    order?: ReactMemberType[];
    groupByVisibility?: boolean;
    respectDependencies?: boolean;
}
export interface FileDeclarationConfig {
    enabled?: boolean;
    order?: DeclarationType[];
    respectDependencies?: boolean;
}
export interface SortersConfig {
    classMembers?: ClassMemberConfig;
    reactComponents?: ReactComponentConfig;
    fileDeclarations?: FileDeclarationConfig;
    include?: string[];
    exclude?: string[];
}
export interface CoreConfig {
    prettier?: PrettierConfig;
    packageJson?: PackageJsonConfig;
    tsConfig?: TsConfigConfig;
    sorters?: SortersConfig;
}
export declare const defaultConfig: CoreConfig;
export declare function mergeConfig(userConfig: Partial<CoreConfig>): CoreConfig;

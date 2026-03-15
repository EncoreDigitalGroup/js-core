import { MemberType } from "../";
import { DeclarationType } from "../";
import { IndexGenerationConfig } from "../";
export interface ClassMemberConfig {
    enabled?: boolean;
    order?: MemberType[];
    groupByVisibility?: boolean;
    respectDependencies?: boolean;
}
export interface CodeStyleConfig {
    enabled?: boolean;
    quoteStyle?: "single" | "double";
    semicolons?: "always" | "never";
    bracketSpacing?: boolean;
    indentStyle?: "tab" | "space";
    indentWidth?: number;
    lineWidth?: number;
    trailingCommas?: "none" | "es5" | "all";
    arrowParens?: "always" | "avoid";
}
export interface ImportConfig {
    enabled?: boolean;
    sortImports?: boolean;
    removeUnused?: boolean;
    removeSideEffects?: boolean;
    groupImports?: boolean;
    groupOrder?: string[];
    separateGroups?: boolean;
}
export interface ReactComponentConfig {
    enabled?: boolean;
    order?: MemberType[];
    groupByVisibility?: boolean;
    respectDependencies?: boolean;
}
export interface FileDeclarationConfig {
    enabled?: boolean;
    order?: DeclarationType[];
    respectDependencies?: boolean;
}
export interface SortingConfig {
    enabled?: boolean;
    classMembers?: ClassMemberConfig;
    reactComponents?: ReactComponentConfig;
    fileDeclarations?: FileDeclarationConfig;
    include?: string[];
    exclude?: string[];
}
export interface SpacingConfig {
    enabled?: boolean;
    betweenDeclarations?: boolean;
    beforeReturns?: boolean;
    betweenStatementTypes?: boolean;
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
export declare enum FormatterOrder {
    IndexGeneration = "IndexGeneration",
    CodeStyle = "CodeStyle",
    ImportOrganization = "ImportOrganization",
    ASTTransformation = "ASTTransformation",
    Spacing = "Spacing"
}
export interface CoreConfig {
    indexGeneration?: IndexGenerationConfig;
    codeStyle?: CodeStyleConfig;
    imports?: ImportConfig;
    sorting?: SortingConfig;
    spacing?: SpacingConfig;
    packageJson?: PackageJsonConfig;
    tsConfig?: TsConfigConfig;
    formatterOrder?: FormatterOrder[];
    skipReactFiles?: boolean;
}
export declare class ConfigTypes {
    static getArrowParenOptions(): Array<"always" | "avoid">;
    static getFormatterOrderOptions(): FormatterOrder[];
    static getImportGroupOptions(): string[];
    static getIndentStyleOptions(): Array<"tab" | "space">;
    static getQuoteStyleOptions(): Array<"single" | "double">;
    static getSemicolonOptions(): Array<"always" | "never">;
    static getTrailingCommaOptions(): Array<"none" | "es5" | "all">;
    static isRecommendedLineWidth(width: number): boolean;
    static isValidArrowParenOption(option: string): option is "always" | "avoid";
    static isValidIndentStyle(style: string): style is "tab" | "space";
    static isValidIndentWidth(width: number): boolean;
    static isValidQuoteStyle(style: string): style is "single" | "double";
    static isValidSemicolonOption(option: string): option is "always" | "never";
    static isValidTrailingCommaOption(option: string): option is "none" | "es5" | "all";
}

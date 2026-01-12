/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/


// ===== NEW ARCHITECTURE (v2.0+) =====
// Pipeline
export {FormatterPipeline, FormatterError, type PipelineContext, type FormatterExecution} from "./core/pipeline";
export {FormatterOrder} from "./config/types";
// Formatting Rules
export {IFormattingRule} from "./core/formatters/IFormattingRule";
// Code Style Rules
export {QuoteStyleRule} from "./core/formatters/rules/style/QuoteStyleRule";
export {SemicolonRule} from "./core/formatters/rules/style/SemicolonRule";
export {BracketSpacingRule} from "./core/formatters/rules/style/BracketSpacingRule";
export {IndentationRule} from "./core/formatters/rules/style/IndentationRule";
export {BlockSpacingRule} from "./core/formatters/rules/style/BlockSpacingRule";
// Import Organization Rules
export {ImportOrganizationRule} from "./core/formatters/rules/imports/ImportOrganizationRule";
// AST Sorting Rules
export {ClassMemberSortingRule, MemberType, type ClassMember, DEFAULT_CLASS_ORDER} from "./core/formatters/rules/ast/ClassMemberSortingRule";
export {FileDeclarationSortingRule, DeclarationType, type FileDeclaration, DEFAULT_FILE_ORDER} from "./core/formatters/rules/ast/FileDeclarationSortingRule";
// Spacing Rules
export {BetweenDeclarationsRule} from "./core/formatters/rules/spacing/BetweenDeclarationsRule";
export {BeforeReturnsRule} from "./core/formatters/rules/spacing/BeforeReturnsRule";
export {BetweenStatementTypesRule} from "./core/formatters/rules/spacing/BetweenStatementTypesRule";
// AST Utilities
export {ASTAnalyzer, DependencyResolver, ASTTransformer, type ReferenceInfo} from "./core/ast";
// Configuration
export {

    type CoreConfig,
    type CodeStyleConfig,
    type ImportConfig,
    type SortingConfig,
    type SpacingConfig,
    type PackageJsonConfig,
    type TsConfigConfig,
    type ClassMemberConfig,
    type ReactComponentConfig,
    type FileDeclarationConfig,

    defaultConfig,
    loadConfig,
    hasConfigFile,
    CONFIG_FILE_NAME,
} from "./config";
// ===== LEGACY EXPORTS (Backward Compatibility) =====

export {sortPackageFile, sortPackageJson} from "./sortPackage";
export {sortTsConfigFile, sortTsConfig} from "./sortTSConfig"

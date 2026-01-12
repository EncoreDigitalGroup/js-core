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
export {IndentationRule} from "./core/formatters/rules/style/IndentationRule";
// Import Organization Rules
export {ImportOrganizationRule} from "./core/formatters/rules/imports/ImportOrganizationRule";
// Index Generation Rules
export {IndexGenerationRule, type IndexGenerationConfig, type IndexGenerationOptions} from "./core/formatters/rules/index/IndexGenerationRule";
// AST Sorting Rules
export {ClassMemberSortingRule, MemberType, type ClassMember, DEFAULT_CLASS_ORDER} from "./core/formatters/rules/ast/ClassMemberSortingRule";
export {FileDeclarationSortingRule, DeclarationType, type FileDeclaration, DEFAULT_FILE_ORDER} from "./core/formatters/rules/ast/FileDeclarationSortingRule";
// Spacing Rules
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

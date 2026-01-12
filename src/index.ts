/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
// ===== NEW ARCHITECTURE (v2.0+) =====
// Pipeline
export { FormatterPipeline, FormatterError, type PipelineContext, type FormatterExecution } from "./core/pipeline";
export { FormatterOrder } from "./config/types";
// Base Formatters
export { IFormatter } from "./core/formatters/base/IFormatter";
export { BaseFormatter } from "./core/formatters/base/BaseFormatter";
// Code Style Formatters
export { CodeStyleFormatter, IStyleRule, QuoteStyleRule, SemicolonRule, BracketSpacingRule, IndentationRule, } from "./core/formatters/style";
// Import Formatters
export { ImportOrganizer } from "./core/formatters/imports";
// AST Formatters
export { ASTFormatter, ClassMemberFormatter, FileDeclarationFormatter, MemberType, DeclarationType, type ClassMember, type FileDeclaration, DEFAULT_CLASS_ORDER, DEFAULT_FILE_ORDER, } from "./core/formatters/ast";
// Spacing Formatters
export { BlankLineFormatter, ISpacingRule, BetweenDeclarationsRule, BeforeReturnsRule, BetweenStatementTypesRule, } from "./core/formatters/spacing";
// AST Utilities
export { ASTAnalyzer, DependencyResolver, ASTTransformer, type ReferenceInfo } from "./core/ast";
// Configuration
export { type CoreConfig, type CodeStyleConfig, type ImportConfig, type SortingConfig, type SpacingConfig, type PackageJsonConfig, type TsConfigConfig, type ClassMemberConfig, type ReactComponentConfig, type FileDeclarationConfig, defaultConfig, loadConfig, hasConfigFile, CONFIG_FILE_NAME, } from "./config";
// ===== LEGACY EXPORTS (Backward Compatibility) =====
export { sortPackageFile, sortPackageJson } from "./sortPackage";
export { sortTsConfigFile, sortTsConfig } from "./sortTSConfig";

/**
* @deprecated Use FormatterPipeline instead
*/
export { sortClassMembersInFile, sortClassMembersInDirectory, type SortClassMembersConfig } from "./sortClassMembers";

/**
* @deprecated Use core/formatters/ast exports instead
*/
export { type SortConfig, compareMembers } from "./shared/classMemberTypes";

/**
* @deprecated Use ClassMemberFormatter instead
*/
export { sortClassMembers, transformClass } from "./formatters/class";

/**
* @deprecated Use ClassMemberFormatter with React config instead
*/
export { sortReactMembers, transformReactComponent, isReactComponent, ReactMemberType, DEFAULT_REACT_ORDER, } from "./formatters/react";

/**
* @deprecated Use FileDeclarationFormatter instead
*/
export { transformFile, sortFileDeclarations, type FileSortConfig } from "./formatters/file";

/**
* @deprecated Use 'sorting' config instead
*/
export { type SortersConfig } from "./config";

/**
* @deprecated Prettier is no longer used - use 'codeStyle' config instead
*/
export { type PrettierConfig, mergeConfig } from "./config";

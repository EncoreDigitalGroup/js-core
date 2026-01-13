/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../config";
import { IFormattingRule } from "../formatters";
import { FormatterPipeline } from "../pipeline";
import { IServiceContainer } from "./IServiceContainer";

/**
 * Service tokens for dependency injection
 * Centralizes all service identifiers to avoid string literals throughout the codebase
 */
export const ServiceTokens = {
    // Core services
    ServiceContainer: Symbol("ServiceContainer"),
    Config: Symbol("Config"),
    FormatterPipeline: Symbol("FormatterPipeline"),

    // Formatter rules
    QuoteStyleRule: Symbol("QuoteStyleRule"),
    SemicolonRule: Symbol("SemicolonRule"),
    BracketSpacingRule: Symbol("BracketSpacingRule"),
    IndentationRule: Symbol("IndentationRule"),
    BlockSpacingRule: Symbol("BlockSpacingRule"),
    DocBlockCommentRule: Symbol("DocBlockCommentRule"),
    ImportOrganizationRule: Symbol("ImportOrganizationRule"),
    ClassMemberSortingRule: Symbol("ClassMemberSortingRule"),
    FileDeclarationSortingRule: Symbol("FileDeclarationSortingRule"),
    BlankLineBetweenDeclarationsRule: Symbol("BlankLineBetweenDeclarationsRule"),
    BlankLineBetweenStatementTypesRule: Symbol("BlankLineBetweenStatementTypesRule"),
    BlankLineBeforeReturnsRule: Symbol("BlankLineBeforeReturnsRule"),
    IndexGenerationRule: Symbol("IndexGenerationRule"),
} as const;

/**
 * Type-safe service token interface
 */
export interface ServiceRegistry {
    [ServiceTokens.ServiceContainer]: IServiceContainer;
    [ServiceTokens.Config]: CoreConfig;
    [ServiceTokens.FormatterPipeline]: FormatterPipeline;
    [ServiceTokens.QuoteStyleRule]: IFormattingRule;
    [ServiceTokens.SemicolonRule]: IFormattingRule;
    [ServiceTokens.BracketSpacingRule]: IFormattingRule;
    [ServiceTokens.IndentationRule]: IFormattingRule;
    [ServiceTokens.BlockSpacingRule]: IFormattingRule;
    [ServiceTokens.DocBlockCommentRule]: IFormattingRule;
    [ServiceTokens.ImportOrganizationRule]: IFormattingRule;
    [ServiceTokens.ClassMemberSortingRule]: IFormattingRule;
    [ServiceTokens.FileDeclarationSortingRule]: IFormattingRule;
    [ServiceTokens.BlankLineBetweenDeclarationsRule]: IFormattingRule;
    [ServiceTokens.BlankLineBetweenStatementTypesRule]: IFormattingRule;
    [ServiceTokens.BlankLineBeforeReturnsRule]: IFormattingRule;
    [ServiceTokens.IndexGenerationRule]: IFormattingRule;
}
/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../config";
import {
    BlockSpacingRule,
    BracketSpacingRule,
    ClassMemberSortingRule,
    DestructuredParamRule,
    DocBlockCommentRule,
    FileDeclarationSortingRule,
    ImportOrganizationRule,
    ImportShorteningRule,
    IndexGenerationRule,
    JsxSelfClosingRule,
    LogicalOperatorPlacementRule,
    QuoteStyleRule,
    SemicolonRule,
    StatementSpacingRule,
    StructuralIndentationRule
} from "../formatters";
import {FormatterPipeline} from "../pipeline";
import {Container} from "./Container";

/** Simple service registration for our custom DI container */
export class ServiceRegistration {
    static registerServices(container: Container, config: CoreConfig): void {
        // Register core config
        container.singleton("CoreConfig", config);

        // Register all formatter rules as singletons with automatic dependency injection
        container.singleton(QuoteStyleRule);
        container.singleton(SemicolonRule);
        container.singleton(BracketSpacingRule);
        container.singleton(LogicalOperatorPlacementRule);
        container.singleton(StructuralIndentationRule);
        container.singleton(BlockSpacingRule);
        container.singleton(DocBlockCommentRule);
        container.singleton(StatementSpacingRule);
        container.singleton(JsxSelfClosingRule);
        container.singleton(DestructuredParamRule);
        container.singleton(ImportShorteningRule);
        container.singleton(ImportOrganizationRule);
        container.singleton(ClassMemberSortingRule);
        container.singleton(FileDeclarationSortingRule);
        container.singleton(IndexGenerationRule);

        // Register formatter pipeline
        container.singleton("FormatterPipeline", new FormatterPipeline(config, container));
    }
}
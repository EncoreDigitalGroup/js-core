/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../config";
import { QuoteStyleRule, SemicolonRule, BracketSpacingRule, IndentationRule, StructuralIndentationRule, BlockSpacingRule, DocBlockCommentRule, ImportOrganizationRule, ClassMemberSortingRule, FileDeclarationSortingRule, BlankLineBetweenDeclarationsRule, BlankLineBetweenStatementTypesRule, BlankLineBeforeReturnsRule, IndexGenerationRule } from "../formatters";
import { FormatterPipeline } from "../pipeline";
import { Container } from "./Container";


/** Simple service registration for our custom DI container */
export class ServiceRegistration {
    static registerServices(container: Container, config: CoreConfig): void {
        // Register core config
        container.singleton("CoreConfig", config);

        // Register all formatter rules as singletons with automatic dependency injection
        container.singleton(QuoteStyleRule);
        container.singleton(SemicolonRule);
        container.singleton(BracketSpacingRule);
        container.singleton(IndentationRule);
        container.singleton(StructuralIndentationRule);
        container.singleton(BlockSpacingRule);
        container.singleton(DocBlockCommentRule);
        container.singleton(ImportOrganizationRule);
        container.singleton(ClassMemberSortingRule);
        container.singleton(FileDeclarationSortingRule);
        container.singleton(BlankLineBetweenDeclarationsRule);
        container.singleton(BlankLineBetweenStatementTypesRule);
        container.singleton(BlankLineBeforeReturnsRule);
        container.singleton(IndexGenerationRule);

        // Register formatter pipeline
        container.singleton("FormatterPipeline", new FormatterPipeline(config, container));
    }
}
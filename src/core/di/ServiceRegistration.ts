/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../config";
import { QuoteStyleRule, SemicolonRule, BracketSpacingRule, IndentationRule, BlockSpacingRule, DocBlockCommentRule, ImportOrganizationRule, ClassMemberSortingRule, FileDeclarationSortingRule, BlankLineBetweenDeclarationsRule, BlankLineBetweenStatementTypesRule, BlankLineBeforeReturnsRule, IndexGenerationRule } from "../formatters";
import { FormatterPipeline } from "../pipeline";
import { Container } from "./Container";


/** Simple service registration for our custom DI container */
export class ServiceRegistration {
    static registerServices(container: Container, config: CoreConfig): void {
        // Register core config
        container.singleton<CoreConfig>(config);

        // Register all formatter rules as singletons
        container.singleton<QuoteStyleRule>(new QuoteStyleRule(container));
        container.singleton<SemicolonRule>(new SemicolonRule(container));
        container.singleton<BracketSpacingRule>(new BracketSpacingRule(container));
        container.singleton<IndentationRule>(new IndentationRule(container));
        container.singleton<BlockSpacingRule>(new BlockSpacingRule(container));
        container.singleton<DocBlockCommentRule>(new DocBlockCommentRule(container));
        container.singleton<ImportOrganizationRule>(new ImportOrganizationRule(container));
        container.singleton<ClassMemberSortingRule>(new ClassMemberSortingRule(container));
        container.singleton<FileDeclarationSortingRule>(new FileDeclarationSortingRule(container));
        container.singleton<BlankLineBetweenDeclarationsRule>(new BlankLineBetweenDeclarationsRule(container));
        container.singleton<BlankLineBetweenStatementTypesRule>(new BlankLineBetweenStatementTypesRule(container));
        container.singleton<BlankLineBeforeReturnsRule>(new BlankLineBeforeReturnsRule(container));
        container.singleton<IndexGenerationRule>(new IndexGenerationRule(container));

        // Register formatter pipeline
        container.singleton<FormatterPipeline>(new FormatterPipeline(config, container));
    }
}
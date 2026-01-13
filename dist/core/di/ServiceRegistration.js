"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ClassMemberSortingRule = require("../formatters/rules/ast/ClassMemberSortingRule.js");
const FileDeclarationSortingRule = require("../formatters/rules/ast/FileDeclarationSortingRule.js");
const ImportOrganizationRule = require("../formatters/rules/imports/ImportOrganizationRule.js");
const IndexGenerationRule = require("../formatters/rules/index-generation/IndexGenerationRule.js");
const BlankLineBeforeReturnsRule = require("../formatters/rules/spacing/BlankLineBeforeReturnsRule.js");
const BlankLineBetweenDeclarationsRule = require("../formatters/rules/spacing/BlankLineBetweenDeclarationsRule.js");
const BlankLineBetweenStatementTypesRule = require("../formatters/rules/spacing/BlankLineBetweenStatementTypesRule.js");
const BlockSpacingRule = require("../formatters/rules/spacing/BlockSpacingRule.js");
const BracketSpacingRule = require("../formatters/rules/spacing/BracketSpacingRule.js");
const DocBlockCommentRule = require("../formatters/rules/style/DocBlockCommentRule.js");
const IndentationRule = require("../formatters/rules/style/IndentationRule.js");
const QuoteStyleRule = require("../formatters/rules/style/QuoteStyleRule.js");
const SemicolonRule = require("../formatters/rules/style/SemicolonRule.js");
const FormatterPipeline = require("../pipeline/FormatterPipeline.js");
class ServiceRegistration {
  static registerServices(container, config) {
    container.singleton("CoreConfig", config);
    container.singleton(QuoteStyleRule.QuoteStyleRule);
    container.singleton(SemicolonRule.SemicolonRule);
    container.singleton(BracketSpacingRule.BracketSpacingRule);
    container.singleton(IndentationRule.IndentationRule);
    container.singleton(BlockSpacingRule.BlockSpacingRule);
    container.singleton(DocBlockCommentRule.DocBlockCommentRule);
    container.singleton(ImportOrganizationRule.ImportOrganizationRule);
    container.singleton(ClassMemberSortingRule.ClassMemberSortingRule);
    container.singleton(FileDeclarationSortingRule.FileDeclarationSortingRule);
    container.singleton(BlankLineBetweenDeclarationsRule.BlankLineBetweenDeclarationsRule);
    container.singleton(BlankLineBetweenStatementTypesRule.BlankLineBetweenStatementTypesRule);
    container.singleton(BlankLineBeforeReturnsRule.BlankLineBeforeReturnsRule);
    container.singleton(IndexGenerationRule.IndexGenerationRule);
    container.singleton("FormatterPipeline", new FormatterPipeline.FormatterPipeline(config, container));
  }
}
exports.ServiceRegistration = ServiceRegistration;

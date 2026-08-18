/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";
import {ASTAnalyzer, DependencyResolver} from "../../../ast";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/** Types of top-level declarations in a file */
export enum DeclarationType {
    Interface = "interface",
    TypeAlias = "type_alias",
    Enum = "enum",
    HelperFunction = "helper_function",
    HelperVariable = "helper_variable",
    ExportedFunction = "exported_function",
    ExportedVariable = "exported_variable",
    ExportedClass = "exported_class",
    DefaultExport = "default_export",
    Other = "other"
}

/** Analyzed file declaration with metadata */
export interface FileDeclaration {
    node: ts.Statement;
    type: DeclarationType;
    name: string;
    isExported: boolean;
    isDefaultExport: boolean;
    text: string;
    dependencies?: Set<string>;
    originalIndex?: number;
}

/** Default order for file declarations */
export const DEFAULT_FILE_ORDER: DeclarationType[] = [
    DeclarationType.Interface,
    DeclarationType.TypeAlias,
    DeclarationType.Enum,
    DeclarationType.HelperFunction,
    DeclarationType.HelperVariable,
    DeclarationType.ExportedFunction,
    DeclarationType.ExportedVariable,
    DeclarationType.ExportedClass,
    DeclarationType.DefaultExport,
    DeclarationType.Other,
];

/** Sorts file-level declarations according to configured order */
export class FileDeclarationSortingRule extends BaseFormattingRule {
    readonly name = "FileDeclarationSortingRule";

    /** Determine the type of a top-level declaration */
    private getDeclarationType(node: ts.Statement): DeclarationType {
        const exported = ASTAnalyzer.isExported(node);
        const defaultExp = ASTAnalyzer.isDefaultExport(node);
        if (defaultExp) {
            return DeclarationType.DefaultExport;
        }

        if (ts.isInterfaceDeclaration(node)) {
            return DeclarationType.Interface;
        }

        if (ts.isTypeAliasDeclaration(node)) {
            return DeclarationType.TypeAlias;
        }

        if (ts.isEnumDeclaration(node)) {
            return DeclarationType.Enum;
        }

        if (ts.isFunctionDeclaration(node)) {
            return exported ? DeclarationType.ExportedFunction : DeclarationType.HelperFunction;
        }

        if (ts.isVariableStatement(node)) {
            return exported ? DeclarationType.ExportedVariable : DeclarationType.HelperVariable;
        }

        if (ts.isClassDeclaration(node)) {
            return exported ? DeclarationType.ExportedClass : DeclarationType.Other;
        }

        if (ts.isExportAssignment(node)) {
            return DeclarationType.DefaultExport;
        }

        return DeclarationType.Other;
    }

    /** Analyze a top-level statement */
    private analyzeDeclaration(node: ts.Statement, sourceFile: ts.SourceFile, index: number, allDeclarationNames: Set<string>): FileDeclaration {
        const type = this.getDeclarationType(node);
        const name = ASTAnalyzer.getDeclarationName(node);
        const isExported = ASTAnalyzer.isExported(node);
        const isDefaultExport = ASTAnalyzer.isDefaultExport(node);
        const text = node.getFullText(sourceFile);

        // Extract dependencies
        const allDependencies = ASTAnalyzer.extractFileDeclarationReferences(node, allDeclarationNames);

        // Remove self-reference
        const dependencies = new Set(Array.from(allDependencies).filter(dep => dep !== name));

        return {
            node,
            type,
            name,
            isExported,
            isDefaultExport,
            text,
            dependencies,
            originalIndex: index,
        };
    }

    /** Sort file declarations according to configuration */
    private sortFileDeclarations(declarations: FileDeclaration[]): FileDeclaration[] {
        const config = this.getSortingConfig()?.fileDeclarations;
        const order = config?.order || DEFAULT_FILE_ORDER;

        return [...declarations].sort((a, b) => {
            const aTypeIndex = order.indexOf(a.type);
            const bTypeIndex = order.indexOf(b.type);

            // Sort by type first
            if (aTypeIndex !== bTypeIndex) {
                return aTypeIndex - bTypeIndex;
            }

            // Within the same type, sort alphabetically by name
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Re-anchors a declaration's `getFullText()` (leading trivia included) to the enclosing
     * scope's indentation: strips only the leading blank lines that separated it from whatever
     * preceded it in its *original* position, leaving the declaration's own indentation, leading
     * comments, and internal (multi-line body) formatting completely untouched. Never `.trim()`s
     * to column 0 the way the pre-migration reconstruction did.
     */
    private reanchorToEnclosingIndent(fullText: string): string {
        return fullText.replace(/^\n+/, "");
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getSortingConfig()?.fileDeclarations;
        if (!config?.enabled) {
            return;
        }

        // The shared project already parses this file with the correct ScriptKind (TSX for
        // .tsx/.jsx), so JSX-bearing top-level declarations are structurally sound on this tree.
        const sourceFile = context.sourceFile.compilerNode;
        const originalText = context.getText();

        // Separate imports from other declarations
        const imports: ts.Statement[] = [];
        const otherStatements: ts.Statement[] = [];

        sourceFile.statements.forEach(statement => {
            if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
                imports.push(statement);
            } else if (!ts.isEmptyStatement(statement)) {
                // Filter out empty statements (standalone semicolons)
                otherStatements.push(statement);
            }
        });

        if (otherStatements.length === 0) {
            return;
        }

        // Analyze and sort declarations
        const allDeclarationNames = new Set<string>(otherStatements.map(stmt =>
            ASTAnalyzer.getDeclarationName(stmt)).filter(n => n));

        const analyzedDeclarations = otherStatements.map((stmt, index) =>
            this.analyzeDeclaration(stmt, sourceFile, index, allDeclarationNames)
        );

        let sortedDeclarations = this.sortFileDeclarations(analyzedDeclarations);

        if (config.respectDependencies !== false) {
            sortedDeclarations = DependencyResolver.reorderWithDependencies(sortedDeclarations, d => d.name);
        }

        // Check if reordering is needed
        const orderChanged = sortedDeclarations.some((decl, index) => decl.originalIndex !== index);
        if (!orderChanged) {
            return;
        }

        // Reconstruct file with reordered declarations using each declaration's original text,
        // re-anchored to the enclosing scope's indentation — never trimmed to column 0.
        const firstDeclaration = otherStatements[0];
        const lastDeclaration = otherStatements[otherStatements.length - 1];
        const declarationsStart = firstDeclaration.getFullStart();
        const declarationsEnd = lastDeclaration.getEnd();

        // Build new declarations section from sorted texts
        const declarationTexts = sortedDeclarations.map(d => this.reanchorToEnclosingIndent(d.text));
        const newDeclarations = declarationTexts.join("\n\n");

        // Replace the declarations section (add spacing between imports and declarations)
        const formatted = originalText.substring(0, declarationsStart) + "\n\n" + newDeclarations + originalText.substring(declarationsEnd);
        if (formatted !== originalText) {
            context.sourceFile.replaceWithText(formatted);
        }
    }
}

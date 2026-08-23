/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";
import {ASTAnalyzer, DependencyResolver} from "../../../ast";
import {DeclarationType} from "../../../config/ConfigTypes";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

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
     * Offset in `text` where the first declaration's *own* content begins for header-pinning: the
     * start of the doc comment attached directly above it (no blank line between the comment and the
     * declaration), or the declaration's own start when nothing is attached. Everything before this
     * offset — the license header and any file-level block comments separated from the declaration
     * by a blank line — is the file header that must stay pinned at the top; the attached doc comment
     * travels with the declaration when it is reordered.
     */
    private firstDeclarationContentStart(text: string, firstDeclaration: ts.Statement, sourceFile: ts.SourceFile): number {
        const declStart = firstDeclaration.getStart(sourceFile);
        const comments = ts.getLeadingCommentRanges(text, firstDeclaration.getFullStart()) ?? [];
        let attachedStart = declStart;

        for (let i = comments.length - 1; i >= 0; i--) {
            const gapEnd = i === comments.length - 1 ? declStart : comments[i + 1].pos;
            const gap = text.substring(comments[i].end, gapEnd);

            // A blank line (two or more newlines) between this comment and what follows it detaches
            // it from the declaration: it is a file-level comment, not the declaration's doc comment.
            if ((gap.match(/\n/g) ?? []).length > 1) {
                break;
            }

            attachedStart = comments[i].pos;
        }

        return attachedStart;
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

        // When no imports precede the declarations, the file's leading comment block (license header
        // and any file-level block comment) is the leading trivia of the first declaration. Sorting
        // must not carry that header off with the declaration, so pin it at the top of the file. But
        // a doc comment attached directly above the first declaration (no blank line between them) is
        // that declaration's own comment and must travel with it — so the header ends where the
        // attached comment begins, not at the declaration node. With imports present the header sits
        // before them and is already outside this span, preserved by `substring(0, declarationsStart)`.
        const contentStart = declarationsStart === 0
            ? this.firstDeclarationContentStart(originalText, firstDeclaration, sourceFile)
            : 0;

        const leadingTrivia = declarationsStart === 0 ? originalText.substring(0, contentStart) : "";
        const fileHeader = leadingTrivia.includes("/*") || leadingTrivia.includes("//") ? leadingTrivia : "";

        // Build new declarations section from sorted texts. The header-owning declaration is emitted
        // from its own content start (keeping any attached doc comment, dropping the pinned header);
        // every other declaration keeps its own leading comments.
        const declarationTexts = sortedDeclarations.map(d =>
            fileHeader && d.node === firstDeclaration
                ? this.reanchorToEnclosingIndent(originalText.substring(contentStart, d.node.getEnd()))
                : this.reanchorToEnclosingIndent(d.text));

        const newDeclarations = declarationTexts.join("\n\n");

        // Emit the pinned header (if any), then the declarations. When imports precede the
        // declarations, keep them and separate them from the declarations with a blank line.
        const importPrefix = originalText.substring(0, declarationsStart);
        const tail = originalText.substring(declarationsEnd);
        const formatted = fileHeader
            ? fileHeader + newDeclarations + tail
            : (importPrefix ? importPrefix + "\n\n" : "") + newDeclarations + tail;

        if (formatted !== originalText) {
            context.sourceFile.replaceWithText(formatted);
        }
    }
}

export {DeclarationType};
/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import {ImportConfig} from "../../../config/types";
import {BaseFormatter} from "../base/BaseFormatter";

interface ImportInfo {

    statement: ts.ImportDeclaration;
    moduleSpecifier: string;
    importClause?: ts.ImportClause;
    isTypeOnly: boolean;
    isSideEffect: boolean;
    group: "external" | "internal" | "relative";
}

/**
 * Organizes and formats import statements
 */
export class ImportOrganizer extends BaseFormatter {
    readonly name = "ImportOrganizer";

    constructor(private readonly config: ImportConfig) {
        super();
    }

    private createSourceFile(source: string, filePath: string): ts.SourceFile {
        return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    }

    private determineImportGroup(moduleSpecifier: string): "external" | "internal" | "relative" {
        if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/")) {
            return "relative";
        }

        if (moduleSpecifier.startsWith("@/") || moduleSpecifier.startsWith("~/")) {
            return "internal";
        }

        return "external";
    }

    private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
        const imports: ImportInfo[] = [];

        for (const statement of sourceFile.statements) {
            if (ts.isImportDeclaration(statement)) {
                const moduleSpecifier = (statement.moduleSpecifier as ts.StringLiteral).text;
                const isSideEffect = !statement.importClause;
                const isTypeOnly = statement.importClause?.isTypeOnly || false;
                const group = this.determineImportGroup(moduleSpecifier);

                imports.push({
                    statement,
                    moduleSpecifier,
                    importClause: statement.importClause,
                    isTypeOnly,
                    isSideEffect,
                    group,
                });
            }
        }

        return imports;
    }

    private getImportedIdentifiers(importInfo: ImportInfo): string[] {
        const identifiers: string[] = [];

        if (!importInfo.importClause) {
            return identifiers;
        }

        // Default import
        if (importInfo.importClause.name) {
            identifiers.push(importInfo.importClause.name.text);
        }

        // Named imports
        if (importInfo.importClause.namedBindings) {
            if (ts.isNamedImports(importInfo.importClause.namedBindings)) {
                for (const element of importInfo.importClause.namedBindings.elements) {
                    identifiers.push(element.name.text);
                }
            } else if (ts.isNamespaceImport(importInfo.importClause.namedBindings)) {
                identifiers.push(importInfo.importClause.namedBindings.name.text);
            }
        }

        return identifiers;
    }

    private isIdentifierUsed(identifier: string, sourceFile: ts.SourceFile): boolean {
        let found = false;

        const visit = (node: ts.Node): void => {
            if (found)
                return;

            if (ts.isIdentifier(node) && node.text === identifier) {
                // Make sure it's not the import declaration itself
                const parent = node.parent;

                if (!ts.isImportSpecifier(parent) && !ts.isImportClause(parent)) {
                    found = true;
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        return found;
    }

    private isImportUsed(importInfo: ImportInfo, sourceFile: ts.SourceFile): boolean {
        // Side-effect imports are considered "used"
        if (importInfo.isSideEffect) {
            return true;
        }

        if (!importInfo.importClause) {
            return true;
        }

        const identifiers = this.getImportedIdentifiers(importInfo);

        return identifiers.some(id => this.isIdentifierUsed(id, sourceFile));
    }

    private filterUnusedImports(imports: ImportInfo[], sourceFile: ts.SourceFile): ImportInfo[] {
        // Don't remove side-effect imports unless configured
        if (!this.config.removeSideEffects) {
            return imports.filter(imp => imp.isSideEffect || this.isImportUsed(imp, sourceFile));
        }

        return imports.filter(imp => this.isImportUsed(imp, sourceFile));
    }

    private sortImports(imports: ImportInfo[]): ImportInfo[] {
        return [...imports].sort((a, b) => {
            // Sort by module specifier alphabetically
            return a.moduleSpecifier.localeCompare(b.moduleSpecifier);
        });
    }

    private groupImports(imports: ImportInfo[]): ImportInfo[] {
        const groupOrder = this.config.groupOrder || ["external", "internal", "relative"];
        const grouped: ImportInfo[] = [];

        for (const group of groupOrder) {
            const groupImports = imports.filter(imp => imp.group === group);

            grouped.push(...groupImports);
        }

        return grouped;
    }

    private reconstructSource(sourceFile: ts.SourceFile, imports: ImportInfo[]): string {
        const fullText = sourceFile.getFullText();

        // Extract and remove leading comments/copyright to avoid duplication
        const leadingCommentsMatch = fullText.match(/^(\/\*[\s\S]*?\*\/\s*)/);
        const leadingComments = leadingCommentsMatch ? leadingCommentsMatch[1].trim() : "";
        const sourceWithoutLeadingComments = leadingCommentsMatch ? fullText.substring(leadingCommentsMatch[0].length) : fullText;

        // Create a new source file without leading comments for printing
        const cleanSourceFile = ts.createSourceFile(sourceFile.fileName, sourceWithoutLeadingComments, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const printer = ts.createPrinter({
            newLine: ts.NewLineKind.LineFeed,
            removeComments: false,
        });

        // Build import section using original sourceFile for positions
        const importLines: string[] = [];

        let lastGroup: string | null = null;

        for (const importInfo of imports) {
            // Add blank line between groups if configured
            if (this.config.separateGroups &&
                lastGroup !== null &&
                lastGroup !== importInfo.group) {
                importLines.push("");
            }

            let importText = printer.printNode(ts.EmitHint.Unspecified, importInfo.statement, sourceFile);

            // Strip any leading block comments from individual imports
            // (file-level copyright is handled separately at the top)
            importText = importText.replace(/^((?:\/\*[\s\S]*?\*\/\s*)+)/, "").trim();
            importLines.push(importText);
            lastGroup = importInfo.group;
        }

        // Build rest of source using clean source file (without leading comments)
        const nonImportStatements = cleanSourceFile.statements.filter(stmt => !ts.isImportDeclaration(stmt));
        const restLines: string[] = [];

        for (const statement of nonImportStatements) {
            const text = printer.printNode(ts.EmitHint.Unspecified, statement, cleanSourceFile);

            restLines.push(text);
        }

        // Combine with proper spacing
        const result: string[] = [];

        if (leadingComments) {
            result.push(leadingComments);
        }

        if (importLines.length > 0) {
            result.push(importLines.join("\n"));
        }

        if (restLines.length > 0) {
            result.push(restLines.join("\n"));
        }

        let combined = result.join("\n\n");

        // Remove trailing semicolons that TypeScript printer adds after closing braces
        combined = combined.replace(/(\n;)+\s*$/, "\n");

        return combined;
    }

    async format(source: string, filePath: string): Promise<string> {
        if (!this.config.enabled) {
            return source;
        }

        const sourceFile = this.createSourceFile(source, filePath);
        const imports = this.extractImports(sourceFile);

        // Filter unused imports if configured
        let filteredImports = imports;

        if (this.config.removeUnused) {
            filteredImports = this.filterUnusedImports(imports, sourceFile);
        }

        // Sort imports if configured
        if (this.config.sortImports) {
            filteredImports = this.sortImports(filteredImports);
        }

        // Group imports if configured
        if (this.config.groupImports) {
            filteredImports = this.groupImports(filteredImports);
        }

        // Reconstruct source with organized imports
        const formatted = this.reconstructSource(sourceFile, filteredImports);

        this.logFormat(filePath, formatted !== source);

        return formatted;
    }

    protected getSupportedExtensions(): string[] {
        return [".ts", ".tsx", ".js", ".jsx"];
    }
}

/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import {ImportConfig} from "../../../config";
import {IFormattingRule} from "../../IFormattingRule";


interface ImportInfo {
    statement: ts.ImportDeclaration;
    moduleSpecifier: string;
    importClause?: ts.ImportClause;
    isTypeOnly: boolean;
    isSideEffect: boolean;
    group: "external" | "internal" | "relative";
}

/** Organizes and formats import statements */

export class ImportOrganizationRule implements IFormattingRule {
    readonly name = "ImportOrganizationRule";

    constructor(private readonly config: ImportConfig) {
    }

    private createSourceFile(source: string): ts.SourceFile {
        return ts.createSourceFile("temp.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
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
        if (!this.config.removeUnused) {
            return imports;
        }
        // Don't remove side-effect imports unless configured

        if (!this.config.removeSideEffects) {
            return imports.filter(imp => imp.isSideEffect || this.isImportUsed(imp, sourceFile));
        }

        return imports.filter(imp => this.isImportUsed(imp, sourceFile));
    }

    private sortImports(imports: ImportInfo[]): ImportInfo[] {
        if (!this.config.sortImports) {
            return imports;
        }

        return [...imports].sort((a, b) => {
            // Sort by module specifier alphabetically
            return a.moduleSpecifier.localeCompare(b.moduleSpecifier);
        });
    }

    private groupImports(imports: ImportInfo[]): ImportInfo[] {
        if (!this.config.groupImports) {
            return imports;
        }

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

        // Extract ALL leading block comments (not just the first one)
        const leadingCommentsMatch = fullText.match(/^((?:\/\*[\s\S]*?\*\/\s*)+)/);

        let leadingComments = leadingCommentsMatch ? leadingCommentsMatch[1].trim() : "";

        // Deduplicate consecutive identical block comments (fixes copyright duplication)

        if (leadingComments) {
            const commentBlocks = leadingComments.match(/\/\*[\s\S]*?\*\//g) || [];
            const uniqueBlocks = new Set(commentBlocks.map(block => block.trim()));

            leadingComments = Array.from(uniqueBlocks).join("\n");
        }

        // Find the last import statement position

        const importStatements = sourceFile.statements.filter(stmt => ts.isImportDeclaration(stmt));
        const lastImport = importStatements[importStatements.length - 1];
        const afterImportsPos = lastImport ? lastImport.getEnd() : (leadingCommentsMatch ? leadingCommentsMatch[0].length : 0);

        // Extract everything after imports, preserving original formatting

        let restOfFile = fullText.substring(afterImportsPos);
        // Ensure restOfFile starts with a newline

        if (restOfFile && !restOfFile.startsWith("\n")) {
            restOfFile = "\n" + restOfFile;
        }
        // Remove excessive leading blank lines (more than one newline) but keep at least one
        restOfFile = restOfFile.replace(/^\n{2,}/, "\n");

        // Build import section (only reprint imports, not everything else)

        const printer = ts.createPrinter({
            newLine: ts.NewLineKind.LineFeed,
            removeComments: false,
        });

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

        // Combine sections

        const sections: string[] = [];

        if (leadingComments) {
            sections.push(leadingComments);
        }

        if (importLines.length > 0) {
            sections.push(importLines.join("\n"));
        }

        if (restOfFile) {
            sections.push(restOfFile);
        }

        let combined = sections.join("\n\n");

        // Remove trailing semicolons that TypeScript printer adds after closing braces

        combined = combined.replace(/(;\n+)+;?\s*$/, "\n");

        return combined;
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.enabled) {
            return source;
        }

        const sourceFile = this.createSourceFile(source);
        const imports = this.extractImports(sourceFile);

        // Apply all transformations in sequence
        // Each method checks its own config and returns early if disabled

        let processedImports = this.filterUnusedImports(imports, sourceFile);

        processedImports = this.sortImports(processedImports);
        processedImports = this.groupImports(processedImports);

        // Reconstruct source with organized imports
        return this.reconstructSource(sourceFile, processedImports);
    }
}

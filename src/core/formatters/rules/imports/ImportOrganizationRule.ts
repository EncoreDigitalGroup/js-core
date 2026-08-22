/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {ImportDeclaration, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

type ImportGroup = "external" | "internal" | "relative";

interface ImportInfo {
    declaration: ImportDeclaration;
    moduleSpecifier: string;
    isSideEffect: boolean;
    group: ImportGroup;

    /** Local identifiers this import binds into scope: default, namespace, and named (alias-aware) */
    boundNames: string[];
}

/**
 * Organizes and formats import statements.
 * Runs natively against the shared, parse-once TSX-correct `ts-morph` tree: because the shared
 * project parses `.tsx` files with the real `ScriptKind`, JSX-only references (e.g. `<Button/>`)
 * already appear as `Identifier` nodes, so a plain identifier-usage scan is sufficient and correct
 * without a type checker or lib `.d.ts` files (unavailable in the `bun build --compile` binary).
 */
export class ImportOrganizationRule extends BaseFormattingRule {
    readonly name = "ImportOrganizationRule";
    private determineImportGroup(moduleSpecifier: string): ImportGroup {
        if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/")) {
            return "relative";
        }

        if (moduleSpecifier.startsWith("@/") || moduleSpecifier.startsWith("~/")) {
            return "internal";
        }

        return "external";
    }

    /** Local identifiers bound by an import declaration: default, namespace, and named (using the local/alias name) */
    private getBoundNames(declaration: ImportDeclaration): string[] {
        const names: string[] = [];
        const defaultImport = declaration.getDefaultImport();
        if (defaultImport) {
            names.push(defaultImport.getText());
        }

        const namespaceImport = declaration.getNamespaceImport();
        if (namespaceImport) {
            names.push(namespaceImport.getText());
        }

        for (const namedImport of declaration.getNamedImports()) {
            const alias = namedImport.getAliasNode();
            names.push(alias ? alias.getText() : namedImport.getName());
        }

        return names;
    }

    private toImportInfo(declaration: ImportDeclaration): ImportInfo {
        const moduleSpecifier = declaration.getModuleSpecifierValue();
        const isSideEffect = !declaration.getImportClause();

        return {
            declaration,
            moduleSpecifier,
            isSideEffect,
            group: this.determineImportGroup(moduleSpecifier),
            boundNames: this.getBoundNames(declaration),
        };
    }

    private isImportUsed(info: ImportInfo, usedIdentifiers: Set<string>): boolean {
        // Side-effect imports are considered "used"
        if (info.isSideEffect) {
            return true;
        }

        if (info.boundNames.length === 0) {
            return true;
        }

        return info.boundNames.some(name => usedIdentifiers.has(name));
    }

    private filterUnusedImports(imports: ImportInfo[], usedIdentifiers: Set<string>): ImportInfo[] {
        const config = this.getImportsConfig();
        if (!config?.removeUnused) {
            return imports;
        }

        // Don't remove side-effect imports unless configured
        if (!config.removeSideEffects) {
            return imports.filter(info => info.isSideEffect || this.isImportUsed(info, usedIdentifiers));
        }

        return imports.filter(info => this.isImportUsed(info, usedIdentifiers));
    }

    private sortImports(imports: ImportInfo[]): ImportInfo[] {
        const config = this.getImportsConfig();
        if (!config?.sortImports) {
            return imports;
        }

        return [...imports].sort((a, b) => a.moduleSpecifier.localeCompare(b.moduleSpecifier));
    }

    private groupImports(imports: ImportInfo[]): ImportInfo[] {
        const config = this.getImportsConfig();
        if (!config?.groupImports) {
            return imports;
        }

        const groupOrder = (config.groupOrder as ImportGroup[] | undefined) || ["external", "internal", "relative"];
        const grouped: ImportInfo[] = [];

        for (const group of groupOrder) {
            grouped.push(...imports.filter(info => info.group === group));
        }

        return grouped;
    }

    /** Builds the replacement text for the import-block span from the surviving imports, in their final order */
    private buildImportBlockText(imports: ImportInfo[]): string {
        const config = this.getImportsConfig();
        const lines: string[] = [];
        let lastGroup: ImportGroup | null = null;

        for (const info of imports) {
            if (config?.separateGroups && lastGroup !== null && lastGroup !== info.group) {
                lines.push("");
            }

            lines.push(info.declaration.getText());
            lastGroup = info.group;
        }

        return lines.join("\n");
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getImportsConfig();
        if (!config?.enabled) {
            return;
        }

        const sourceFile = context.sourceFile;
        const originalDeclarations = sourceFile.getImportDeclarations();
        if (originalDeclarations.length === 0) {
            return;
        }

        // Identifiers bound anywhere in an import declaration (specifiers, aliases) never count as
        // a "use" of the import itself; everything else — including JSX-only references, because
        // the shared tree parses .tsx correctly — does.
        const usedIdentifiers = new Set(
            sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(id => !id.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
                .map(id => id.getText())
        );

        let imports = originalDeclarations.map(declaration => this.toImportInfo(declaration));
        imports = this.filterUnusedImports(imports, usedIdentifiers);
        imports = this.sortImports(imports);
        imports = this.groupImports(imports);

        // Rebuild only the import-block span: the exact character range from the first import's
        // start through the original last import's end (determined from AST node positions, not
        // a regex-derived header guess), replaced with the surviving imports' text in their final
        // order. Everything outside that span — including the file body below the imports — is
        // copied through untouched, so it stays byte-for-byte intact.
        // (ts-morph's node-level `replaceText` cannot reconcile a span whose statement count or
        // order changed against the existing tree, so the new full text is applied in one go via
        // `replaceWithText`, the same primitive `BaseFormattingRule`'s legacy bridge uses.)
        const blockStart = originalDeclarations[0].getStart();
        const blockEnd = originalDeclarations[originalDeclarations.length - 1].getEnd();
        const newBlockText = this.buildImportBlockText(imports);
        const fullText = sourceFile.getFullText();
        const newFullText = fullText.slice(0, blockStart) + newBlockText + fullText.slice(blockEnd);
        if (newFullText !== fullText) {
            sourceFile.replaceWithText(newFullText);
        }
    }
}
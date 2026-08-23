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

    /**
     * Text that replaces the declaration's own source when set — used when several same-module
     * imports were consolidated into one statement. When absent, `declaration.getText()` is used.
     */
    mergedText?: string;
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

    /**
     * Build a single import statement text from a bucket of same-module, same-type-only imports, or
     * return null when they can't share one statement (more than one distinct default identifier).
     */
    private buildMergedImportText(bucket: ImportInfo[]): string | null {
        const pad = this.config.codeStyle?.bracketSpacing ? " " : "";
        const defaults = new Set<string>();
        const named: string[] = [];
        const seenNamed = new Set<string>();

        for (const member of bucket) {
            const def = member.declaration.getDefaultImport();
            if (def) {
                defaults.add(def.getText());
            }

            for (const spec of member.declaration.getNamedImports()) {
                const text = spec.getText();
                if (!seenNamed.has(text)) {
                    seenNamed.add(text);
                    named.push(text);
                }
            }
        }

        if (defaults.size > 1) {
            return null;
        }

        const parts: string[] = [];

        if (defaults.size === 1) {
            parts.push([...defaults][0]);
        }

        if (named.length > 0) {
            parts.push(`{${pad}${named.join(", ")}${pad}}`);
        }

        const first = bucket[0];
        const prefix = first.declaration.isTypeOnly() ? "import type " : "import ";
        return `${prefix}${parts.join(", ")} from "${first.moduleSpecifier}";`;
    }

    /**
     * Merge multiple imports from the same module into one statement. Only plain named/default
     * imports participate; a namespace import (`* as ns`) or a side-effect import is never merged,
     * and value vs. type-only (`import type …`) imports stay in separate buckets so meaning is
     * preserved. A bucket with conflicting default names is left unmerged.
     */
    private consolidateImports(imports: ImportInfo[]): ImportInfo[] {
        const config = this.getImportsConfig();
        if (!config?.mergeDuplicates) {
            return imports;
        }

        // Group mergeable imports by module + type-only-ness, preserving first-occurrence order.
        const mergeKey = (info: ImportInfo): string | null => {
            const decl = info.declaration;
            const mergeable = !info.isSideEffect
                && decl.getNamespaceImport() === undefined
                && (decl.getDefaultImport() !== undefined || decl.getNamedImports().length > 0);

            return mergeable ? `${decl.isTypeOnly() ? "type " : ""}${info.moduleSpecifier}` : null;
        };

        const buckets = new Map<string, ImportInfo[]>();

        for (const info of imports) {
            const key = mergeKey(info);
            if (key === null) {
                continue;
            }

            (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(info);
        }

        // Decide the merged text per bucket (only where merging is possible and worthwhile).
        const mergedByKey = new Map<string, string>();

        for (const [key, bucket] of buckets) {
            if (bucket.length < 2) {
                continue;
            }

            const merged = this.buildMergedImportText(bucket);
            if (merged !== null) {
                mergedByKey.set(key, merged);
            }
        }

        // Rebuild the list in original order: a merged bucket emits its single statement at its first
        // member and drops the rest; every other import (non-mergeable, or a bucket left unmerged
        // because of conflicting defaults) passes through untouched, so no import is ever lost.
        const emitted = new Set<string>();
        const result: ImportInfo[] = [];

        for (const info of imports) {
            const key = mergeKey(info);
            if (key !== null && mergedByKey.has(key)) {
                if (emitted.has(key)) {
                    continue;
                }

                emitted.add(key);
                result.push({...info, mergedText: mergedByKey.get(key)});
            } else {
                result.push(info);
            }
        }

        return result;
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

    /**
     * Sort key for a single named-import specifier: its imported name, lower-cased, with an inline
     * `type ` modifier stripped so `type ReactElement` orders next to a plain `ReactElement`. An
     * alias (`foo as bar`) still sorts by the imported name `foo`.
     */
    private specifierSortKey(specifier: string): string {
        return specifier
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0]
            .trim()
            .toLowerCase();
    }

    /**
     * Alphabetize the specifiers inside a single import's `{ ... }` clause, preserving the exact
     * inner padding (whatever BracketSpacingRule already applied) and each specifier's own text
     * (`type` modifier and `as` alias included). Multi-line brace groups are left untouched so a
     * reorder never collapses them onto one line.
     */
    private sortNamedSpecifiers(importText: string): string {
        return importText.replace(/\{([^{}]*)\}/, (whole, inner: string) => {
            if (inner.includes("\n")) {
                return whole;
            }

            const leadPad = inner.match(/^\s*/)?.[0] ?? "";
            const trailPad = inner.match(/\s*$/)?.[0] ?? "";
            const specifiers = inner
                .split(",")
                .map(s => s.trim())
                .filter(s => s.length > 0);

            if (specifiers.length < 2) {
                return whole;
            }

            specifiers.sort((a, b) => this.specifierSortKey(a).localeCompare(this.specifierSortKey(b)));

            return `{${leadPad}${specifiers.join(", ")}${trailPad}}`;
        });
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

            const text = info.mergedText ?? info.declaration.getText();
            lines.push(config?.sortImports ? this.sortNamedSpecifiers(text) : text);
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
        imports = this.consolidateImports(imports);
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
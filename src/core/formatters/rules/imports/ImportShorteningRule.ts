/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as fs from "fs";
import * as path from "path";
import {ImportDeclaration, Project} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/** tsconfig `paths` for one project, plus the base directory those patterns resolve against. */
interface PathsInfo {
    baseDir: string;
    entries: Array<{ pattern: string; targets: string[] }>;
}

/**
 * Rewrites a deep relative import to the shortest tsconfig-path alias whose barrel provably
 * re-exports the same symbols from the same source module.
 *
 *   import {CardBlockRenderer} from "../../shared/CardBlockRenderer";
 *   -> import {CardBlockRenderer} from "@gather_marketing/components";
 *
 * Safety: a rewrite happens only when every named symbol of the import resolves — through the
 * candidate barrel's fully-resolved exports (`export *` chains included) — back to the exact module
 * the relative path points at. Default and namespace imports are never touched. Runs before
 * ImportOrganizationRule so the shortened specifiers are then sorted, grouped, and merged.
 */
export class ImportShorteningRule extends BaseFormattingRule {
    private readonly barrelCache = new Map<string, Map<string, string>>();
    readonly name = "ImportShorteningRule";
    private readonly pathsCache = new Map<string, PathsInfo | null>();

    /** Real-filesystem ts-morph project per tsconfig, used purely to resolve barrel exports. */
    private readonly projectCache = new Map<string, Project>();
    private readonly tsconfigCache = new Map<string, string | null>();

    /** Resolve a module specifier to the real file it names, or null. */
    private resolveModuleFile(fromDir: string, specifier: string): string | null {
        const base = path.resolve(fromDir, specifier);
        const exts = [".ts", ".tsx", ".d.ts", ".js", ".jsx"];
        for (const ext of exts) {
            if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
                return base + ext;
            }
        }

        for (const ext of exts) {
            const idx = path.join(base, "index" + ext);
            if (fs.existsSync(idx) && fs.statSync(idx).isFile()) {
                return idx;
            }
        }

        return null;
    }

    /** Add the barrel and every file reachable through its relative `export … from` chain. */
    private addReexportSubtree(project: Project, filePath: string, seen: Set<string>, depth: number): void {
        if (depth > 15 || seen.has(filePath)) {
            return;
        }

        seen.add(filePath);

        const sourceFile = project.addSourceFileAtPathIfExists(filePath) ?? project.getSourceFile(filePath);
        if (!sourceFile) {
            return;
        }

        for (const exportDecl of sourceFile.getExportDeclarations()) {
            const specifier = exportDecl.getModuleSpecifierValue();
            if (specifier && specifier.startsWith(".")) {
                const resolved = this.resolveModuleFile(path.dirname(filePath), specifier);
                if (resolved) {
                    this.addReexportSubtree(project, resolved, seen, depth + 1);
                }
            }
        }
    }

    /** Shortest alias specifier that resolves to `dirAbs` via the tsconfig paths, or null. */
    private aliasForDir(dirAbs: string, pathsInfo: PathsInfo): string | null {
        let best: string | null = null;
        const consider = (alias: string) => {
            if (best === null || alias.length < best.length) {
                best = alias;
            }
        };

        for (const {pattern, targets} of pathsInfo.entries) {
            for (const target of targets) {
                if (pattern.includes("*")) {
                    if (!target.includes("*")) {
                        continue;
                    }

                    const targetBase = path.resolve(pathsInfo.baseDir, target.replace("*", ""));
                    const rel = path.relative(targetBase, dirAbs);
                    if (rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel)) {
                        consider(pattern.replace("*", rel.split(path.sep).join("/")));
                    }
                } else {
                    const resolved = path.resolve(pathsInfo.baseDir, target);
                    if (resolved === dirAbs) {
                        consider(pattern);
                    }
                }
            }
        }

        return best;
    }

    /** Nearest tsconfig.json walking up from `startDir`, or null. */
    private findTsconfig(startDir: string): string | null {
        const cached = this.tsconfigCache.get(startDir);
        if (cached !== undefined) {
            return cached;
        }

        let dir = startDir;
        let found: string | null = null;

        while (true) {
            const candidate = path.join(dir, "tsconfig.json");
            if (fs.existsSync(candidate)) {
                found = candidate;
                break;
            }

            const parent = path.dirname(dir);
            if (parent === dir) {
                break;
            }

            dir = parent;
        }

        this.tsconfigCache.set(startDir, found);

        return found;
    }

    private getProject(tsconfigPath: string): Project | undefined {
        let project = this.projectCache.get(tsconfigPath);
        if (project) {
            return project;
        }
        try {
            project = new Project({
                tsConfigFilePath: tsconfigPath,
                skipAddingFilesFromTsConfig: true,
            });

            this.projectCache.set(tsconfigPath, project);

            return project;
        } catch {
            return undefined;
        }
    }

    /** Parse the tsconfig `paths`/`baseUrl` (following `extends`) into resolvable patterns. */
    private getPathsInfo(project: Project | undefined, tsconfigPath: string): PathsInfo | null {
        if (!project) {
            return null;
        }

        if (this.pathsCache.has(tsconfigPath)) {
            return this.pathsCache.get(tsconfigPath)!;
        }

        const options = project.getCompilerOptions();
        const rawPaths = options.paths ?? {};
        const tsconfigDir = path.dirname(tsconfigPath);
        const baseDir = options.baseUrl ? path.resolve(tsconfigDir, options.baseUrl) : tsconfigDir;
        const entries = Object.entries(rawPaths).map(([pattern, targets]) => ({
            pattern,
            targets: targets as string[],
        }));

        const info: PathsInfo = {baseDir, entries};
        this.pathsCache.set(tsconfigPath, entries.length > 0 ? info : null);

        return this.pathsCache.get(tsconfigPath)!;
    }

    /** The barrel index file in `dir`, or null. */
    private findBarrel(dir: string): string | null {
        for (const ext of [".ts", ".tsx"]) {
            const candidate = path.join(dir, "index" + ext);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    /** Map of every symbol a barrel exports to the absolute file that defines it. */
    private getBarrelExports(project: Project, barrelPath: string): Map<string, string> {
        const cached = this.barrelCache.get(barrelPath);
        if (cached) {
            return cached;
        }

        const map = new Map<string, string>();
        try {
            // `getExportedDeclarations()` only resolves `export *` chains for files already in the
            // project, so pull the barrel's relative re-export subtree in first.
            this.addReexportSubtree(project, barrelPath, new Set<string>(), 0);

            const sourceFile = project.getSourceFile(barrelPath);
            if (sourceFile) {
                for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
                    const decl = declarations[0];
                    if (decl) {
                        map.set(name, decl.getSourceFile().getFilePath());
                    }
                }
            }
        } catch {
            // Unresolvable barrel — treat as exporting nothing, so no unsafe rewrite happens.
        }

        this.barrelCache.set(barrelPath, map);

        return map;
    }

    /** Rewrite one import declaration's module specifier to the best alias, when one is proven safe. */
    private tryShorten(
        declaration: ImportDeclaration,
        fileDir: string,
        projectRoot: string,
        project: Project,
        pathsInfo: PathsInfo,
    ): void {
        const specifier = declaration.getModuleSpecifierValue();
        if (!specifier.startsWith(".")) {
            return; // Already a bare/alias specifier.
        }

        // Only pure named imports: default/namespace bindings can't come through an `export *` barrel.
        if (declaration.getDefaultImport() || declaration.getNamespaceImport()) {
            return;
        }

        const symbols = declaration.getNamedImports().map(named => named.getName());
        if (symbols.length === 0) {
            return;
        }

        const target = this.resolveModuleFile(fileDir, specifier);
        if (!target) {
            return;
        }

        // Walk barrels from the module's own directory up to the project root; each barrel that
        // re-exports every symbol back to `target` is a candidate. Keep the shortest alias.
        let best: string | null = null;
        let dir = path.dirname(target);
        while (dir.startsWith(projectRoot)) {
            const barrel = this.findBarrel(dir);
            if (barrel && barrel !== target) {
                const exportsMap = this.getBarrelExports(project, barrel);
                const allMatch = symbols.every(s => exportsMap.get(s) === target);
                if (allMatch) {
                    const alias = this.aliasForDir(dir, pathsInfo);
                    if (alias && alias !== specifier && (best === null || alias.length < best.length)) {
                        best = alias;
                    }
                }
            }

            const parent = path.dirname(dir);
            if (parent === dir) {
                break;
            }

            dir = parent;
        }

        if (best) {
            declaration.setModuleSpecifier(best);
        }
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getImportsConfig();
        if (!config?.enabled || !config.shortenPaths) {
            return;
        }

        const filePath = context.filePath;
        const fileDir = path.dirname(filePath);
        const tsconfigPath = this.findTsconfig(fileDir);
        if (!tsconfigPath) {
            return;
        }

        const project = this.getProject(tsconfigPath);
        const pathsInfo = this.getPathsInfo(project, tsconfigPath);
        if (!project || !pathsInfo || pathsInfo.entries.length === 0) {
            return;
        }

        const projectRoot = path.dirname(tsconfigPath);

        for (const declaration of context.sourceFile.getImportDeclarations()) {
            this.tryShorten(declaration, fileDir, projectRoot, project, pathsInfo);
        }
    }
}
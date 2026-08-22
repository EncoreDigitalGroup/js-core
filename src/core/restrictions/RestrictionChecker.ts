/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as fs from "fs";
import {minimatch} from "minimatch";
import * as path from "path";
import {Project} from "ts-morph";
import {ImportRestrictionRule} from "../config";

/** A single business-rule violation found while checking a file's imports against the configured restrictions. */
export interface RestrictionViolation {
    /** Absolute path of the offending file. */
    filePath: string;

    /** 1-based line the offending import declaration starts on. */
    line: number;

    /** 1-based column the offending import declaration starts on. */
    column: number;

    /** The offending module specifier, e.g. "@/internal/Foo". */
    specifier: string;

    /** The configured message for the matched restriction entry. */
    message: string;
}

/**
 * Read-only gate that checks a set of files against `restrictions.imports` rules. This is a separate domain from
 * the formatting pipeline: it never mutates a file, it only reports violations for the CLI to fail fast on.
 */
export class RestrictionChecker {
    constructor(private readonly rules: ImportRestrictionRule[], private readonly configDir: string) {
    }

    /** Normalize an absolute file path to a POSIX-style path relative to configDir, for glob matching. */
    private toRelativePosixPath(filePath: string): string {
        return path.relative(this.configDir, filePath).split(path.sep).join("/");
    }

    /** Rules whose `files` globs match the given config-relative POSIX path. */
    private rulesForFile(relativePath: string): ImportRestrictionRule[] {
        return this.rules.filter(rule => rule.files.some(pattern => minimatch(relativePath, pattern)));
    }

    /**
     * Check a single import specifier against a rule's `allow` list. When the rule has no `allow` list, every
     * specifier passes. When it has one, a specifier matching none of the globs is a violation, reported with
     * `rule.message` or a generated fallback.
     */
    private checkAllow(specifier: string, rule: ImportRestrictionRule): string | undefined {
        if (!rule.allow || rule.allow.length === 0) {
            return undefined;
        }

        const matchesAllowed = rule.allow.some(pattern => minimatch(specifier, pattern));
        if (matchesAllowed) {
            return undefined;
        }

        return rule.message ?? `Import "${specifier}" is not in the allow-list.`;
    }

    /** Whether a module specifier matches a pattern (string) or any pattern in an array. */
    private specifierMatchesPattern(specifier: string, pattern: string | string[]): boolean {
        const patterns = Array.isArray(pattern) ? pattern : [pattern];
        return patterns.some(p => minimatch(specifier, p));
    }

    /**
     * Check a single import specifier against a rule's `forbid` list, returning the first matching entry's
     * violation, or undefined when nothing matches.
     */
    private checkForbid(specifier: string, rule: ImportRestrictionRule): string | undefined {
        for (const entry of rule.forbid ?? []) {
            if (this.specifierMatchesPattern(specifier, entry.pattern)) {
                return entry.message;
            }
        }

        return undefined;
    }

    /** Check every file; returns all violations (empty array => clean). Deterministically ordered by file, then line. */
    check(filePaths: string[]): RestrictionViolation[] {
        const violations: RestrictionViolation[] = [];
        const project = new Project({useInMemoryFileSystem: true});

        for (const filePath of filePaths) {
            const relativePath = this.toRelativePosixPath(filePath);
            const matchingRules = this.rulesForFile(relativePath);
            if (matchingRules.length === 0) {
                continue;
            }

            const source = fs.readFileSync(filePath, "utf-8");
            const sourceFile = project.createSourceFile(filePath, source, {overwrite: true});
            for (const declaration of sourceFile.getImportDeclarations()) {
                const specifier = declaration.getModuleSpecifierValue();

                for (const rule of matchingRules) {
                    const messages: string[] = [];
                    const allowMessage = this.checkAllow(specifier, rule);
                    if (allowMessage !== undefined) {
                        messages.push(allowMessage);
                    }

                    const forbidMessage = this.checkForbid(specifier, rule);
                    if (forbidMessage !== undefined) {
                        messages.push(forbidMessage);
                    }

                    if (messages.length === 0) {
                        continue;
                    }

                    const {line, column} = sourceFile.getLineAndColumnAtPos(declaration.getStart());

                    for (const message of messages) {
                        violations.push({filePath, line, column, specifier, message});
                    }
                }
            }

            project.removeSourceFile(sourceFile);
        }

        violations.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);

        return violations;
    }
}

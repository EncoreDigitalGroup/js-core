/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, beforeAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {ImportRestrictionRule} from "../../config/ConfigTypes";
import {RestrictionChecker} from "../RestrictionChecker";

describe("RestrictionChecker", () => {
    let tempDir: string;
    beforeAll(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "restriction-checker-test-"));
        fs.mkdirSync(path.join(tempDir, "app_modules", "UIKit", "resources"), {recursive: true});
        fs.mkdirSync(path.join(tempDir, "app_modules", "Other"), {recursive: true});
        fs.writeFileSync(
            path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts"),
            `import {Foo} from "@/internal/Foo";\nexport const x = Foo;\n`
        );

        fs.writeFileSync(
            path.join(tempDir, "app_modules", "UIKit", "resources", "array-pattern.ts"),
            `import {Bar} from "app_modules/Other/Bar";\nexport const y = Bar;\n`
        );

        fs.writeFileSync(
            path.join(tempDir, "app_modules", "UIKit", "resources", "clean.ts"),
            `import {Baz} from "./local/Baz";\nexport const z = Baz;\n`
        );

        fs.writeFileSync(
            path.join(tempDir, "app_modules", "Other", "unmatched.ts"),
            `import {Foo} from "@/internal/Foo";\nexport const w = Foo;\n`
        );

        fs.writeFileSync(
            path.join(tempDir, "app_modules", "UIKit", "resources", "nested-multi.ts"),
            `import {A} from "@/internal/A";\nimport {B} from "@/internal/B";\nexport const n = A + B;\n`
        );
    });

    afterAll(() => {
        fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it("matches a forbid entry with a single-string pattern and reports the configured message, line, and column", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: "@/**", message: "UIKit may not import internal modules directly."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toBe("UIKit may not import internal modules directly.");
        expect(violations[0].specifier).toBe("@/internal/Foo");
        expect(violations[0].line).toBe(1);
        expect(violations[0].column).toBe(1);
        expect(violations[0].filePath).toBe(filePath);
    });

    it("matches a forbid entry whose pattern is an array against any listed glob", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: ["app_modules/Other/**", "**/app_modules/Other/**"], message: "No cross-module imports."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "array-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toBe("No cross-module imports.");
        expect(violations[0].specifier).toBe("app_modules/Other/Bar");
    });

    it("does not check a file that does not match the rule's files glob", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: "@/**", message: "UIKit may not import internal modules directly."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "Other", "unmatched.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(0);
    });

    it("yields no violation when a specifier matches no pattern", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: "@/**", message: "UIKit may not import internal modules directly."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "clean.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(0);
    });

    it("returns violations sorted by file path then line", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: "@/**", message: "No internal imports."}],
            },
        ];

        const single = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const nested = path.join(tempDir, "app_modules", "UIKit", "resources", "nested-multi.ts");

        // Pass in reverse order to verify the checker re-sorts, not just preserves the input order.
        const violations = new RestrictionChecker(rules, tempDir).check([nested, single]);
        expect(violations).toHaveLength(3);

        const sortedPaths = [...violations].sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
        expect(violations).toEqual(sortedPaths);
    });

    it("normalizes nested paths to POSIX separators for glob matching", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                forbid: [{pattern: "@/**", message: "No internal imports."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);

        // On Windows this file's relative path contains backslashes; the checker must normalize
        // it to POSIX before matching, or this rule (a POSIX-style glob) would never match.
        expect(violations).toHaveLength(1);
    });

    it("reports a violation with the configured message when a specifier matches none of the allow-list globs", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                allow: ["./local/**"],
                message: "UIKit may only import from its local directory.",
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toBe("UIKit may only import from its local directory.");
        expect(violations[0].specifier).toBe("@/internal/Foo");
    });

    it("does not report a violation when a specifier matches an allow-list glob", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                allow: ["./local/**"],
                message: "UIKit may only import from its local directory.",
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "clean.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(0);
    });

    it("falls back to the generated allow-list message when rule.message is omitted", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                allow: ["./local/**"],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toBe('Import "@/internal/Foo" is not in the allow-list.');
    });

    it("reports violations from both allow and forbid when a rule carries both", () => {
        const rules: ImportRestrictionRule[] = [
            {
                files: ["app_modules/UIKit/resources/**/*.ts"],
                allow: ["./local/**"],
                message: "UIKit may only import from its local directory.",
                forbid: [{pattern: "@/**", message: "UIKit may not import internal modules directly."}],
            },
        ];

        const filePath = path.join(tempDir, "app_modules", "UIKit", "resources", "single-pattern.ts");
        const violations = new RestrictionChecker(rules, tempDir).check([filePath]);
        expect(violations).toHaveLength(2);

        const messages = violations.map(v => v.message).sort();
        expect(messages).toEqual([
            "UIKit may not import internal modules directly.",
            "UIKit may only import from its local directory.",
        ].sort());
    });
});

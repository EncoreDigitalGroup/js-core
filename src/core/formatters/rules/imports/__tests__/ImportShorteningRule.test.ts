/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, beforeAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {ImportShorteningRule} from "../ImportShorteningRule";

describe("ImportShorteningRule", () => {
    const root = path.join(os.tmpdir(), "tsfmt-shorten-fixture");
    const components = path.join(root, "packages/themes/gm/components");
    const consumerDir = path.join(components, "themekit/variants/section");
    const consumer = path.join(consumerDir, "FeatureGridLargeBlock.tsx");

    function write(rel: string, content: string): void {
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), {recursive: true});
        fs.writeFileSync(full, content);
    }

    beforeAll(() => {
        fs.rmSync(root, {recursive: true, force: true});

        write("tsconfig.json", JSON.stringify({
            compilerOptions: {baseUrl: ".", paths: {"@gm/*": ["packages/themes/gm/*"]}},
        }));

        write("package.json", JSON.stringify({name: "fixture"}));
        write("packages/themes/gm/components/themekit/shared/CardBlockRenderer.tsx",
            "export function CardBlockRenderer(): null {\n    return null;\n}\n");
        write("packages/themes/gm/components/themekit/shared/Private.tsx",
            "export function Private(): null {\n    return null;\n}\n");
        write("packages/themes/gm/components/themekit/index.ts",
            "export * from \"./shared/CardBlockRenderer\";\n");
        write("packages/themes/gm/components/index.ts", "export * from \"./themekit\";\n");
        write("packages/themes/gm/components/themekit/variants/section/Local.tsx",
            "export function CardBlockRenderer(): string {\n    return \"x\";\n}\n");
    });

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true});
    });

    function run(source: string): string {
        const config = {imports: {enabled: true, shortenPaths: true}} as CoreConfig;
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new ImportShorteningRule(container);
        const context = new FormatContext(source, consumer);
        rule.applyToContext(context);

        return context.getText();
    }

    it("rewrites a deep relative import to the shortest alias whose barrel re-exports it", () => {
        const input = "import {CardBlockRenderer} from \"../../shared/CardBlockRenderer\";\n";
        expect(run(input)).toBe("import {CardBlockRenderer} from \"@gm/components\";\n");
    });

    it("is idempotent once shortened", () => {
        const shortened = "import {CardBlockRenderer} from \"@gm/components\";\n";
        expect(run(shortened)).toBe(shortened);
    });

    it("leaves a symbol the barrel does not re-export as a relative import", () => {
        const input = "import {Private} from \"../../shared/Private\";\n";
        expect(run(input)).toBe(input);
    });

    it("does not rewrite a same-named symbol that resolves to a different module", () => {
        const input = "import {CardBlockRenderer} from \"./Local\";\n";
        expect(run(input)).toBe(input);
    });

    it("does not touch a default import", () => {
        const input = "import CardBlockRenderer from \"../../shared/CardBlockRenderer\";\n";
        expect(run(input)).toBe(input);
    });

    it("does nothing when shortenPaths is disabled", () => {
        const config = {imports: {enabled: true, shortenPaths: false}} as CoreConfig;
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new ImportShorteningRule(container);
        const input = "import {CardBlockRenderer} from \"../../shared/CardBlockRenderer\";\n";
        const context = new FormatContext(input, consumer);
        rule.applyToContext(context);
        expect(context.getText()).toBe(input);
    });
});
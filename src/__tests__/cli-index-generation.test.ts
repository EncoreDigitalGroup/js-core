/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as path from "path";
import {createTempDirs, runCli} from "./cli-harness";

const indexOnlyConfig = `
import { tsfmt } from "tsfmt";

export default tsfmt({
    indexGeneration: {
        enabled: true,
        directories: ["src"],
        updateMainIndex: false,
    },
    codeStyle: { enabled: false },
    imports: { enabled: false },
    sorting: { enabled: false },
    spacing: { enabled: false },
    packageJson: { enabled: false },
    tsConfig: { enabled: false },
});
`;

describe("CLI index generation", () => {
    const {makeTempDir, cleanup} = createTempDirs();

    afterAll(cleanup);

    function makeProject(dir: string): { file1: string; file2: string; indexPath: string } {
        const srcDir = path.join(dir, "src");
        fs.mkdirSync(srcDir, {recursive: true});
        fs.writeFileSync(path.join(dir, "package.json"), "{}");
        fs.writeFileSync(path.join(dir, "tsfmt.config.ts"), indexOnlyConfig);

        const file1 = path.join(srcDir, "a.ts");
        const file2 = path.join(srcDir, "b.ts");

        fs.writeFileSync(file1, "export const a = 1;\n");
        fs.writeFileSync(file2, "export const b = 2;\n");

        return {file1, file2, indexPath: path.join(srcDir, "index.ts")};
    }

    it("generates barrels when only indexGeneration is enabled", async () => {
        const dir = makeTempDir("cli-index-gen-");
        const {file1, file2, indexPath} = makeProject(dir);
        const before1 = fs.readFileSync(file1);
        const before2 = fs.readFileSync(file2);
        const result = await runCli(dir);
        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(indexPath)).toBe(true);

        const content = fs.readFileSync(indexPath, "utf-8");
        expect(content).toContain('export * from "./a";');
        expect(content).toContain('export * from "./b";');
        expect(fs.readFileSync(file1).equals(before1)).toBe(true);
        expect(fs.readFileSync(file2).equals(before2)).toBe(true);
    });

    it("does not write barrels under --dry", async () => {
        const dir = makeTempDir("cli-index-gen-dry-");
        const {indexPath} = makeProject(dir);
        const result = await runCli(dir, ["--dry"]);
        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(indexPath)).toBe(false);
    });
});
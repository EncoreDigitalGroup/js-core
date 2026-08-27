/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as path from "path";
import {createTempDirs, runCli} from "./cli-harness";

describe("CLI --parallel", () => {
    const {makeTempDir, cleanup} = createTempDirs();

    afterAll(cleanup);

    function writeSource(dir: string, name: string, source: string): string {
        const filePath = path.join(dir, name);
        fs.writeFileSync(filePath, source);

        return filePath;
    }

    it("formats multiple files on worker threads", async () => {
        const dir = makeTempDir("cli-parallel-");
        const file1 = writeSource(dir, "a.ts", "export const a = 'x';\n");
        const file2 = writeSource(dir, "b.ts", "export const b = 'y';\n");
        const result = await runCli(dir, ["--parallel"]);
        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(file1, "utf-8")).toContain('"x"');
        expect(fs.readFileSync(file2, "utf-8")).toContain('"y"');
    });

    it("still formats a single file without spawning a pool", async () => {
        const dir = makeTempDir("cli-parallel-one-");
        const file1 = writeSource(dir, "a.ts", "export const a = 'x';\n");
        const result = await runCli(dir, ["--parallel"]);
        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(file1, "utf-8")).toContain('"x"');
    });

    it("writes nothing under --parallel --dry", async () => {
        const dir = makeTempDir("cli-parallel-dry-");
        const file1 = writeSource(dir, "a.ts", "export const a = 'x';\n");
        const file2 = writeSource(dir, "b.ts", "export const b = 'y';\n");
        const before1 = fs.readFileSync(file1);
        const before2 = fs.readFileSync(file2);
        const result = await runCli(dir, ["--parallel", "--dry"]);
        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(file1).equals(before1)).toBe(true);
        expect(fs.readFileSync(file2).equals(before2)).toBe(true);
    });

    it("rejects unknown flags", async () => {
        const dir = makeTempDir("cli-parallel-unknown-");
        writeSource(dir, "a.ts", "export const a = 'x';\n");

        const result = await runCli(dir, ["--nope"]);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("Unsupported option");
        expect(result.stderr).toContain("--parallel");
    });
});
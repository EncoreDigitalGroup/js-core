/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const violatingSource = `import {Foo} from '@/internal/Foo'

export const bar = Foo
`;

function makeProject(dir: string, configContent: string): string {
    fs.mkdirSync(path.join(dir, "src"), {recursive: true});
    fs.writeFileSync(path.join(dir, "tsfmt.config.ts"), configContent);
    fs.writeFileSync(path.join(dir, "src", "Foo.ts"), violatingSource);

    return path.join(dir, "src", "Foo.ts");
}

const cliPath = path.join(__dirname, "..", "cli.ts");

/** Run the CLI against a target directory, returning exit code and captured output. */
async function runCli(targetDir: string, extraArgs: string[] = []): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn(["bun", cliPath, targetDir, ...extraArgs], {
        stdout: "pipe",
        stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ]);

    return {exitCode, stdout, stderr};
}

const invalidRestrictionsConfig = `
import { tsfmt } from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["src/**/*.ts"],
                forbid: [{pattern: "@/**"}],
            },
        ],
    },
});
`;

const restrictionsConfig = `
import { tsfmt } from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["src/**/*.ts"],
                forbid: [{pattern: "@/**", message: "No internal imports allowed here."}],
            },
        ],
    },
});
`;

describe("CLI restrictions gate", () => {
    const tempDirs: string[] = [];

    function makeTempDir(prefix: string): string {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
        tempDirs.push(dir);

        return dir;
    }

    afterAll(() => {
        for (const dir of tempDirs) {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it("exits non-zero, prints the violation, and leaves the violating file unchanged", async () => {
        const dir = makeTempDir("cli-restrictions-gate-");
        const filePath = makeProject(dir, restrictionsConfig);
        const before = fs.readFileSync(filePath);
        const result = await runCli(dir);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("No internal imports allowed here.");
        expect(result.stderr).toContain('imports "@/internal/Foo"');
        expect(fs.readFileSync(filePath).equals(before)).toBe(true);
    });

    it("still exits non-zero and writes nothing under --dry", async () => {
        const dir = makeTempDir("cli-restrictions-dry-");
        const filePath = makeProject(dir, restrictionsConfig);
        const before = fs.readFileSync(filePath);
        const result = await runCli(dir, ["--dry"]);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("No internal imports allowed here.");
        expect(fs.readFileSync(filePath).equals(before)).toBe(true);
    });

    it("bypasses the gate and formats normally under --no-gate", async () => {
        const dir = makeTempDir("cli-restrictions-no-gate-");
        const filePath = makeProject(dir, restrictionsConfig);
        const before = fs.readFileSync(filePath);
        const result = await runCli(dir, ["--no-gate"]);
        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(filePath).equals(before)).toBe(false);
    });

    it("hard-fails on an invalid restrictions block without formatting anything", async () => {
        const dir = makeTempDir("cli-restrictions-invalid-config-");
        const filePath = makeProject(dir, invalidRestrictionsConfig);
        const before = fs.readFileSync(filePath);
        const result = await runCli(dir);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("Invalid restrictions.imports");
        expect(fs.readFileSync(filePath).equals(before)).toBe(true);
    });
});

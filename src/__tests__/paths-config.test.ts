/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {afterAll, describe, expect, it} from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function isFormatted(content: string): boolean {
    return content.includes('"x"');
}

function isUntouched(content: string): boolean {
    return content.includes("'x'");
}

const cliPath = path.join(__dirname, "..", "cli.ts");

/** Run the CLI with its working directory set to `cwd`, returning exit code and captured output. */
async function runCli(cwd: string, args: string[] = []): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn(["bun", cliPath, ...args], {
        cwd,
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

/** Mis-formatted source (single quotes) — becomes `"x"` once the default double-quote style is applied. */
function src(): string {
    return "export const value = 'x';\n";
}

describe("paths config file discovery", () => {
    const tempDirs: string[] = [];

    function makeTempDir(prefix: string): string {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
        tempDirs.push(dir);

        return dir;
    }

    function write(dir: string, rel: string, content: string): void {
        const full = path.join(dir, rel);
        fs.mkdirSync(path.dirname(full), {recursive: true});
        fs.writeFileSync(full, content);
    }

    function read(dir: string, rel: string): string {
        return fs.readFileSync(path.join(dir, rel), "utf-8");
    }

    function writeConfig(dir: string, configLiteral: string): void {
        fs.writeFileSync(path.join(dir, "tsfmt.config.ts"), `import { tsfmt } from "tsfmt";\n\nexport default tsfmt(${configLiteral});\n`);
    }

    afterAll(() => {
        for (const dir of tempDirs) {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it("bare run with no paths config formats the cwd tree but not node_modules", async () => {
        const dir = makeTempDir("paths-bare-");
        write(dir, "a.ts", src());
        write(dir, "nested/b.ts", src());
        write(dir, "node_modules/pkg/c.ts", src());

        const result = await runCli(dir);
        expect(result.exitCode).toBe(0);
        expect(isFormatted(read(dir, "a.ts"))).toBe(true);
        expect(isFormatted(read(dir, "nested/b.ts"))).toBe(true);
        expect(isUntouched(read(dir, "node_modules/pkg/c.ts"))).toBe(true);
    });

    it("honors config paths.exclude on a bare run", async () => {
        const dir = makeTempDir("paths-exclude-");
        writeConfig(dir, '{paths: {exclude: ["skip/**"]}}');
        write(dir, "keep.ts", src());
        write(dir, "skip/s.ts", src());

        const result = await runCli(dir);
        expect(result.exitCode).toBe(0);
        expect(isFormatted(read(dir, "keep.ts"))).toBe(true);
        expect(isUntouched(read(dir, "skip/s.ts"))).toBe(true);
    });

    it("config paths.include overrides paths.exclude (augmenting)", async () => {
        const dir = makeTempDir("paths-include-override-");
        writeConfig(dir, '{paths: {exclude: ["skip/**"], include: ["skip/keepme.ts"]}}');
        write(dir, "root.ts", src());
        write(dir, "skip/s.ts", src());
        write(dir, "skip/keepme.ts", src());

        const result = await runCli(dir);
        expect(result.exitCode).toBe(0);
        expect(isFormatted(read(dir, "root.ts"))).toBe(true);
        expect(isUntouched(read(dir, "skip/s.ts"))).toBe(true);
        expect(isFormatted(read(dir, "skip/keepme.ts"))).toBe(true);
    });

    it("a CLI path narrows the run and bypasses config paths.exclude", async () => {
        const dir = makeTempDir("paths-cli-narrow-");
        writeConfig(dir, '{paths: {exclude: ["sub/**"]}}');
        write(dir, "sibling.ts", src());
        write(dir, "sub/foo.ts", src());
        write(dir, "sub/bar.ts", src());

        const result = await runCli(dir, ["sub/foo.ts"]);
        expect(result.exitCode).toBe(0);
        expect(isFormatted(read(dir, "sub/foo.ts"))).toBe(true);
        expect(isUntouched(read(dir, "sibling.ts"))).toBe(true);
        expect(isUntouched(read(dir, "sub/bar.ts"))).toBe(true);
    });

    it("formats exactly the multiple paths passed on the CLI", async () => {
        const dir = makeTempDir("paths-cli-multi-");
        write(dir, "a.ts", src());
        write(dir, "dir/b.ts", src());
        write(dir, "dir/c.ts", src());
        write(dir, "other.ts", src());

        const result = await runCli(dir, ["a.ts", "dir"]);
        expect(result.exitCode).toBe(0);
        expect(isFormatted(read(dir, "a.ts"))).toBe(true);
        expect(isFormatted(read(dir, "dir/b.ts"))).toBe(true);
        expect(isFormatted(read(dir, "dir/c.ts"))).toBe(true);
        expect(isUntouched(read(dir, "other.ts"))).toBe(true);
    });

    it("exits non-zero when a passed literal path does not exist", async () => {
        const dir = makeTempDir("paths-missing-");
        write(dir, "present.ts", src());

        const result = await runCli(dir, ["does-not-exist.ts"]);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("does not exist");
        expect(isUntouched(read(dir, "present.ts"))).toBe(true);
    });

    it("exits non-zero when a passed file has an unsupported extension", async () => {
        const dir = makeTempDir("paths-unsupported-");
        write(dir, "notes.md", "# notes\n");

        const result = await runCli(dir, ["notes.md"]);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("Unsupported file type");
    });
});
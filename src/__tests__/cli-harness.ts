/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const cliPath = path.join(__dirname, "..", "cli.ts");

export function createTempDirs(): { makeTempDir: (prefix: string) => string; cleanup: () => void } {
    const tempDirs: string[] = [];

    return {
        makeTempDir(prefix: string): string {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
            tempDirs.push(dir);

            return dir;
        },
        cleanup(): void {
            for (const dir of tempDirs) {
                fs.rmSync(dir, {recursive: true, force: true});
            }
        },
    };
}

export async function runCli(cwd: string, args: string[] = []): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
import {chmod, rm} from "node:fs/promises";

export type BuildMode =
    | {allPlatforms: boolean; kind: "compile"}
    | {kind: "publish"}
    | {kind: "types-only"};

export type PackageJson = {
    name: string;
    optionalDependencies?: Record<string, string>;
    repository: {url: string};
    version: string;
};

export type PlatformSpec = {
    artifactName: string;
    bunTarget: string;
    cpu: string[];
    key: string;
    libc?: string[];
    os: string[];
};

export type PublishAttemptResult = "already-published" | "published" | "retry";

export type PublishPlan = {
    publishRoot: boolean;
    rootName: string;
    targets: PlatformSpec[];
};

export type ScopedPackageManifest = {
    cpu: string[];
    description: string;
    files: string[];
    libc?: string[];
    license: string;
    name: string;
    os: string[];
    repository: {url: string};
    version: string;
};

export type VersionExists = (name: string, version: string) => Promise<boolean>;

function binNameFor(spec: PlatformSpec): string {
    return spec.artifactName.endsWith(".exe") ? "tsfmt.exe" : "tsfmt";
}

export function npmPackumentUrl(name: string, version: string): string {
    return `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
}

export async function packageVersionExists(name: string, version: string): Promise<boolean> {
    const response = await fetch(npmPackumentUrl(name, version));
    if (response.status === 404) {
        return false;
    }

    if (!response.ok) {
        throw new Error(`npm registry lookup failed for ${name}@${version}: HTTP ${response.status}`);
    }

    return true;
}

export const rootDir = `${import.meta.dir}/..`;

export function publishCwd(packageDir?: string): string {
    return packageDir ? `${rootDir}/${packageDir}` : rootDir;
}

export const publishRetryAttempts = 6;

export async function classifyPublishAttempt(
    name: string,
    version: string,
    exitCode: number,
    exists: VersionExists,
): Promise<PublishAttemptResult> {
    if (exitCode === 0) {
        return "published";
    }

    if (await exists(name, version)) {
        return "already-published";
    }

    return "retry";
}

export function publishRetryWaitMs(attempt: number): number {
    return 5_000 * attempt;
}

async function runPublish(
    name: string,
    version: string,
    npmTag: string,
    npmToken: string,
    packageDir?: string,
    exists: VersionExists = packageVersionExists,
): Promise<void> {
    const cwd = publishCwd(packageDir);
    const npmrcPath = `${cwd}/.npmrc`;
    await Bun.write(npmrcPath, `//registry.npmjs.org/:_authToken=${npmToken}\n`);
    try {
        for (let attempt = 1; attempt <= publishRetryAttempts; attempt++) {
            const proc = Bun.spawn(["bun", "publish", "--access", "public", "--tag", npmTag], {
                cwd,
                stderr: "inherit",
                stdout: "inherit",
            });

            const result = await classifyPublishAttempt(name, version, await proc.exited, exists);
            if (result === "published" || result === "already-published") {
                return;
            }

            if (attempt === publishRetryAttempts) {
                throw new Error(`publish failed for ${name}@${version}`);
            }

            const waitMs = publishRetryWaitMs(attempt);
            console.log(`Publish of ${name}@${version} failed (attempt ${attempt}/${publishRetryAttempts}); retrying in ${waitMs}ms`);
            await Bun.sleep(waitMs);
        }
    } finally {
        await rm(npmrcPath, {force: true});
    }
}

const distNpmRelDir = "dist-npm";

export function compileOutfile(artifactName: string): string {
    return artifactName.replace(/\.exe$/, "");
}

export const binariesDir = `${rootDir}/binaries`;

export async function compileStandaloneBinary(spec: PlatformSpec): Promise<void> {
    const outfile = `${binariesDir}/${compileOutfile(spec.artifactName)}`;
    const proc = Bun.spawn([
        "bun",
        "build",
        "--compile",
        `--target=${spec.bunTarget}`,
        `${rootDir}/src/cli.ts`,
        `--outfile=${outfile}`,
    ], {
        cwd: rootDir,
        stderr: "inherit",
        stdout: "inherit",
    });

    if (await proc.exited !== 0) {
        throw new Error(`compile failed for ${spec.bunTarget}`);
    }
}

export async function compileStandaloneBinaries(targets: PlatformSpec[]): Promise<void> {
    if (targets.length === 0) {
        throw new Error(`No binary target for ${process.platform}-${process.arch}`);
    }

    for (const target of targets) {
        await compileStandaloneBinary(target);
    }
}

export async function emitDeclarationFiles(): Promise<void> {
    const proc = Bun.spawn([
        "bun",
        "x",
        "tsc",
        "-p",
        "tsconfig.json",
        "--emitDeclarationOnly",
        "--declarationDir",
        "dist",
        "--ignoreDeprecations",
        "6.0",
    ], {
        cwd: rootDir,
        stderr: "inherit",
        stdout: "inherit",
    });

    if (await proc.exited !== 0) {
        throw new Error("tsc failed");
    }
}

export const platforms: PlatformSpec[] = [
    {
        artifactName: "tsfmt-darwin-arm64",
        bunTarget: "bun-darwin-arm64",
        cpu: ["arm64"],
        key: "darwin-arm64",
        os: ["darwin"],
    },
    {
        artifactName: "tsfmt-darwin-x64",
        bunTarget: "bun-darwin-x64",
        cpu: ["x64"],
        key: "darwin-x64",
        os: ["darwin"],
    },
    {
        artifactName: "tsfmt-linux-x64",
        bunTarget: "bun-linux-x64",
        cpu: ["x64"],
        key: "linux-x64",
        libc: ["glibc"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-arm64",
        bunTarget: "bun-linux-arm64",
        cpu: ["arm64"],
        key: "linux-arm64",
        libc: ["glibc"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-x64-musl",
        bunTarget: "bun-linux-x64-musl",
        cpu: ["x64"],
        key: "linux-x64-musl",
        libc: ["musl"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-arm64-musl",
        bunTarget: "bun-linux-arm64-musl",
        cpu: ["arm64"],
        key: "linux-arm64-musl",
        libc: ["musl"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-win32-x64.exe",
        bunTarget: "bun-windows-x64",
        cpu: ["x64"],
        key: "win32-x64",
        os: ["win32"],
    },
    {
        artifactName: "tsfmt-win32-arm64.exe",
        bunTarget: "bun-windows-arm64",
        cpu: ["arm64"],
        key: "win32-arm64",
        os: ["win32"],
    },
];

export function isMusl(): boolean {
    if (process.platform !== "linux") {
        return false;
    }

    const result = Bun.spawnSync(["ldd", "--version"]);
    return result.stdout.toString().includes("musl") || result.stderr.toString().includes("musl");
}

export function hostPlatforms(): PlatformSpec[] {
    return platforms.filter((spec) => {
        if (!spec.os.includes(process.platform) || !spec.cpu.includes(process.arch)) {
            return false;
        }

        if (!spec.libc) {
            return true;
        }

        return isMusl() ? spec.libc.includes("musl") : spec.libc.includes("glibc");
    });
}

export async function loadPackageJson(): Promise<PackageJson> {
    return await Bun.file(`${rootDir}/package.json`).json() as PackageJson;
}

export function npmDistTag(version: string): "alpha" | "beta" | "latest" | "rc" {
    const match = /^(?:\d+\.\d+\.\d+)(?:-(alpha|beta|rc)\d+)?$/.exec(version);
    if (!match) {
        throw new Error(`Cannot derive npm dist-tag from version: ${version}`);
    }

    const prerelease = match[1];
    if (prerelease === "alpha" || prerelease === "beta" || prerelease === "rc") {
        return prerelease;
    }

    return "latest";
}

export function parseBuildMode(argv: string[]): BuildMode {
    const args = new Set(argv);
    if (args.has("--types-only")) {
        return {kind: "types-only"};
    }

    if (args.has("--publish")) {
        return {kind: "publish"};
    }

    return {allPlatforms: args.has("--all"), kind: "compile"};
}

export function scopedPackageName(key: string): string {
    return `@tsfmt/${key}`;
}

export async function planPublish(
    version: string,
    exists: VersionExists = packageVersionExists,
): Promise<PublishPlan> {
    const pkg = await loadPackageJson();
    const targets: PlatformSpec[] = [];

    for (const spec of platforms) {
        if (!await exists(scopedPackageName(spec.key), version)) {
            targets.push(spec);
        }
    }

    return {
        publishRoot: !await exists(pkg.name, version),
        rootName: pkg.name,
        targets,
    };
}

export const publishGapMs = 10_000;

export async function publishPackages(
    version: string,
    plan: PublishPlan,
    exists: VersionExists = packageVersionExists,
): Promise<void> {
    const npmToken = process.env.NPM_TOKEN;
    if (!npmToken) {
        throw new Error("Set NPM_TOKEN to publish packages.");
    }

    const npmTag = npmDistTag(version);
    const pending: {dir?: string; name: string}[] = plan.targets.map((spec) => {
        const name = scopedPackageName(spec.key);
        return {dir: `${distNpmRelDir}/${name}`, name};
    });

    if (plan.publishRoot) {
        pending.push({name: plan.rootName});
    }

    for (const [index, item] of pending.entries()) {
        if (await exists(item.name, version)) {
            console.log(`Skipping ${item.name}@${version} — already on npm`);
            continue;
        }

        await runPublish(item.name, version, npmTag, npmToken, item.dir, exists);

        if (index < pending.length - 1) {
            await Bun.sleep(publishGapMs);
        }
    }
}

export function publishPlanIsEmpty(plan: PublishPlan): boolean {
    return plan.targets.length === 0 && !plan.publishRoot;
}

export const releaseTagPattern = /^v\d+\.\d+\.\d+(-(alpha|beta|rc)\d+)?$/;

export function resolveReleaseVersion(): string {
    const tag = process.env.CI_COMMIT_TAG;
    if (!tag || !releaseTagPattern.test(tag)) {
        throw new Error(
            `CI_COMMIT_TAG must be a valid release tag (vX.Y.Z, vX.Y.Z-alphaN, vX.Y.Z-betaN, or vX.Y.Z-rcN), got: ${tag ?? "(unset)"}`,
        );
    }

    return tag.replace(/^v/, "");
}

export const distNpmDir = `${rootDir}/${distNpmRelDir}`;

export function scopedPackageDir(key: string): string {
    return `${distNpmDir}/${scopedPackageName(key)}`;
}

export async function scopedPackageManifest(spec: PlatformSpec, version: string): Promise<ScopedPackageManifest> {
    const pkg = await loadPackageJson();
    const manifest: ScopedPackageManifest = {
        cpu: spec.cpu,
        description: `tsfmt binary for ${spec.key}`,
        files: [`bin/${binNameFor(spec)}`],
        license: "BSD-3-Clause",
        name: scopedPackageName(spec.key),
        os: spec.os,
        repository: pkg.repository,
        version,
    };

    if (spec.libc) {
        manifest.libc = spec.libc;
    }

    return manifest;
}

export function selectCompileTargets(allPlatforms: boolean): PlatformSpec[] {
    return allPlatforms ? platforms : hostPlatforms();
}

export async function stageScopedPackages(targets: PlatformSpec[], version: string): Promise<void> {
    for (const spec of targets) {
        const binaryPath = `${binariesDir}/${spec.artifactName}`;
        const binaryFile = Bun.file(binaryPath);
        if (!await binaryFile.exists()) {
            throw new Error(`Missing compiled binary for ${spec.key}: ${binaryPath}. Run bun scripts/build.ts --all first.`);
        }

        const manifest = await scopedPackageManifest(spec, version);
        const packageDir = scopedPackageDir(spec.key);
        const binPath = `${packageDir}/bin/${binNameFor(spec)}`;
        await Bun.write(binPath, binaryFile);
        await chmod(binPath, 0o755);
        await Bun.write(`${packageDir}/package.json`, `${JSON.stringify(manifest, null, 4)}\n`);
    }
}

export async function stampVersion(version: string): Promise<void> {
    const rootPath = `${rootDir}/package.json`;
    const root = await Bun.file(rootPath).json() as PackageJson;
    root.version = version;
    root.optionalDependencies = {};

    for (const spec of platforms) {
        root.optionalDependencies[scopedPackageName(spec.key)] = version;
    }

    await Bun.write(rootPath, `${JSON.stringify(root, null, 4)}\n`);

    for (const spec of platforms) {
        const manifestPath = `${scopedPackageDir(spec.key)}/package.json`;
        const manifestFile = Bun.file(manifestPath);
        if (!await manifestFile.exists()) {
            continue;
        }

        const manifest = await manifestFile.json() as ScopedPackageManifest;
        manifest.version = version;
        await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`);
    }
}

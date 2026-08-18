export type BuildMode = {
    allPlatforms: boolean;
    compile: boolean;
    emitTypes: boolean;
    upload: boolean;
};

export type PackageJson = {
    repository: {url: string};
    version: string;
};

export type PlatformSpec = {
    artifactName: string;
    bunTarget: string;
    cpu: string[];
    libc?: string[];
    os: string[];
};

function gitlabUploadHeaders(): Record<string, string> {
    const privateToken = process.env.GITLAB_TOKEN;
    const jobToken = process.env.CI_JOB_TOKEN;

    if (privateToken) {
        return {"PRIVATE-TOKEN": privateToken};
    }

    if (jobToken) {
        return {"JOB-TOKEN": jobToken};
    }

    throw new Error("Set GITLAB_TOKEN or CI_JOB_TOKEN to upload binaries.");
}

export function compileOutfile(artifactName: string): string {
    return artifactName.replace(/\.exe$/, "");
}

export const rootDir = `${import.meta.dir}/..`;
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

export function genericPackageUrl(repoUrl: string, version: string, fileName: string): string {
    const repo = repoUrl.replace(/\.git$/, "");
    const parsed = new URL(repo);
    const project = parsed.pathname.replace(/^\//, "");
    return `${parsed.origin}/api/v4/projects/${encodeURIComponent(project)}/packages/generic/tsfmt/${version}/${fileName}`;
}

export const platforms: PlatformSpec[] = [
    {
        artifactName: "tsfmt-darwin-arm64",
        bunTarget: "bun-darwin-arm64",
        cpu: ["arm64"],
        os: ["darwin"],
    },
    {
        artifactName: "tsfmt-darwin-x64",
        bunTarget: "bun-darwin-x64",
        cpu: ["x64"],
        os: ["darwin"],
    },
    {
        artifactName: "tsfmt-linux-x64",
        bunTarget: "bun-linux-x64",
        cpu: ["x64"],
        libc: ["glibc"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-arm64",
        bunTarget: "bun-linux-arm64",
        cpu: ["arm64"],
        libc: ["glibc"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-x64-musl",
        bunTarget: "bun-linux-x64-musl",
        cpu: ["x64"],
        libc: ["musl"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-linux-arm64-musl",
        bunTarget: "bun-linux-arm64-musl",
        cpu: ["arm64"],
        libc: ["musl"],
        os: ["linux"],
    },
    {
        artifactName: "tsfmt-win32-x64.exe",
        bunTarget: "bun-windows-x64",
        cpu: ["x64"],
        os: ["win32"],
    },
    {
        artifactName: "tsfmt-win32-arm64.exe",
        bunTarget: "bun-windows-arm64",
        cpu: ["arm64"],
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

export function parseBuildMode(argv: string[]): BuildMode {
    const args = new Set(argv);
    if (args.has("--types-only")) {
        return {allPlatforms: false, compile: false, emitTypes: true, upload: false};
    }

    if (args.has("--upload") && !args.has("--all") && !args.has("--types-only")) {
        return {allPlatforms: false, compile: false, emitTypes: false, upload: true};
    }

    return {
        allPlatforms: args.has("--all"),
        compile: true,
        emitTypes: true,
        upload: args.has("--upload"),
    };
}

export async function publishBinariesToGitLab(): Promise<void> {
    const pkg = await loadPackageJson();
    const headers = gitlabUploadHeaders();

    for (const spec of platforms) {
        const filePath = `${binariesDir}/${spec.artifactName}`;
        const file = Bun.file(filePath);
        if (!await file.exists()) {
            throw new Error(`Missing ${filePath}. Run bun scripts/build.ts --all first.`);
        }

        const url = genericPackageUrl(pkg.repository.url, pkg.version, spec.artifactName);
        const response = await fetch(url, {
            body: file,
            headers,
            method: "PUT",
        });

        if (!response.ok) {
            throw new Error(`Upload failed for ${spec.artifactName}: ${response.status} ${await response.text()}`);
        }

        console.log(`Uploaded ${spec.artifactName}`);
    }
}

export function selectCompileTargets(allPlatforms: boolean): PlatformSpec[] {
    return allPlatforms ? platforms : hostPlatforms();
}

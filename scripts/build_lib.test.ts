import {afterEach, describe, expect, it} from "bun:test";
import {
    distNpmDir,
    hostPlatforms,
    parseBuildMode,
    platforms,
    resolveReleaseVersion,
    rootDir,
    scopedPackageManifest,
    scopedPackageName,
    stageScopedPackages,
    stampVersion,
} from "./build_lib";
import {platformKey, platformKeys} from "./tsfmt-bin.js";

describe("platforms", () => {
    it("covers eight compile targets", () => {
        expect(platforms).toHaveLength(8);
    });

    it("resolves at least one host target", () => {
        expect(hostPlatforms().length).toBeGreaterThan(0);
    });

    it("derives each key from its artifactName with the tsfmt- prefix and .exe suffix stripped", () => {
        for (const spec of platforms) {
            expect(spec.key).toBe(spec.artifactName.replace(/^tsfmt-/, "").replace(/\.exe$/, ""));
        }
    });

    it("has a unique key for all eight targets", () => {
        const keys = platforms.map((spec) => spec.key);
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe("scopedPackageName", () => {
    it("prefixes the platform key with the @tsfmt scope", () => {
        expect(scopedPackageName("darwin-arm64")).toBe("@tsfmt/darwin-arm64");
    });
});

describe("scopedPackageManifest", () => {
    it("includes libc:[\"glibc\"] for a Linux glibc target", async () => {
        const spec = platforms.find((p) => p.key === "linux-x64")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.libc).toEqual(["glibc"]);
    });

    it("includes libc:[\"musl\"] for a musl target", async () => {
        const spec = platforms.find((p) => p.key === "linux-x64-musl")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.libc).toEqual(["musl"]);
    });

    it("omits libc for darwin targets", async () => {
        const spec = platforms.find((p) => p.key === "darwin-arm64")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.libc).toBeUndefined();
    });

    it("omits libc for win32 targets", async () => {
        const spec = platforms.find((p) => p.key === "win32-x64")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.libc).toBeUndefined();
    });

    it("uses files:[\"bin/tsfmt.exe\"] for win32 targets", async () => {
        const spec = platforms.find((p) => p.key === "win32-arm64")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.files).toEqual(["bin/tsfmt.exe"]);
    });

    it("uses files:[\"bin/tsfmt\"] for non-win32 targets", async () => {
        const spec = platforms.find((p) => p.key === "linux-arm64")!;
        const manifest = await scopedPackageManifest(spec, "1.2.3");
        expect(manifest.files).toEqual(["bin/tsfmt"]);
    });

    it("names every manifest @tsfmt/<key> and carries the passed version", async () => {
        for (const spec of platforms) {
            const manifest = await scopedPackageManifest(spec, "9.9.9");
            expect(manifest.name).toBe(`@tsfmt/${spec.key}`);
            expect(manifest.version).toBe("9.9.9");
        }
    });
});

describe("stageScopedPackages", () => {
    it("throws a clear error when a target's binary is missing from binariesDir", async () => {
        const spec = platforms.find((p) => p.key === "linux-arm64-musl")!;
        await expect(stageScopedPackages([spec], "1.2.3")).rejects.toThrow(
            /Missing compiled binary for linux-arm64-musl/,
        );
    });
});

describe("tsfmt-bin platformKeys", () => {
    it("matches the set of platforms[*].key", () => {
        const expectedKeys = platforms.map((spec) => spec.key);
        expect(new Set(platformKeys)).toEqual(new Set(expectedKeys));
        expect(platformKeys).toHaveLength(expectedKeys.length);
    });
});

describe("tsfmt-bin platformKey", () => {
    it("resolves darwin-arm64", () => {
        expect(platformKey("darwin", "arm64", false)).toBe("darwin-arm64");
    });

    it("resolves darwin-x64", () => {
        expect(platformKey("darwin", "x64", false)).toBe("darwin-x64");
    });

    it("resolves linux-x64 glibc", () => {
        expect(platformKey("linux", "x64", false)).toBe("linux-x64");
    });

    it("resolves linux-x64 musl", () => {
        expect(platformKey("linux", "x64", true)).toBe("linux-x64-musl");
    });

    it("resolves linux-arm64 glibc", () => {
        expect(platformKey("linux", "arm64", false)).toBe("linux-arm64");
    });

    it("resolves linux-arm64 musl", () => {
        expect(platformKey("linux", "arm64", true)).toBe("linux-arm64-musl");
    });

    it("resolves win32-x64", () => {
        expect(platformKey("win32", "x64", false)).toBe("win32-x64");
    });

    it("resolves win32-arm64", () => {
        expect(platformKey("win32", "arm64", false)).toBe("win32-arm64");
    });

    it("throws a clear error for an unknown platform-arch pair", () => {
        expect(() => platformKey("sunos", "x64", false)).toThrow("tsfmt has no binary for sunos-x64");
    });
});

describe("parseBuildMode", () => {
    it("compiles the host by default", () => {
        expect(parseBuildMode([])).toEqual({allPlatforms: false, kind: "compile"});
    });

    it("compiles every platform with --all", () => {
        expect(parseBuildMode(["--all"])).toEqual({allPlatforms: true, kind: "compile"});
    });

    it("emits types only with --types-only", () => {
        expect(parseBuildMode(["--types-only"])).toEqual({kind: "types-only"});
    });

    it("publishes with --publish", () => {
        expect(parseBuildMode(["--publish"])).toEqual({kind: "publish"});
    });
});

describe("resolveReleaseVersion", () => {
    const originalTag = process.env.CI_COMMIT_TAG;
    afterEach(() => {
        if (originalTag === undefined) {
            delete process.env.CI_COMMIT_TAG;
        } else {
            process.env.CI_COMMIT_TAG = originalTag;
        }
    });

    it("strips the leading v from a valid semver tag", () => {
        process.env.CI_COMMIT_TAG = "v1.2.3";
        expect(resolveReleaseVersion()).toBe("1.2.3");
    });

    it("throws when CI_COMMIT_TAG is unset", () => {
        delete process.env.CI_COMMIT_TAG;
        expect(() => resolveReleaseVersion()).toThrow();
    });

    it("throws when CI_COMMIT_TAG is not a valid semver tag", () => {
        process.env.CI_COMMIT_TAG = "not-a-version";
        expect(() => resolveReleaseVersion()).toThrow();
    });
});

describe("stampVersion", () => {
    it("sets the version and creates optionalDependencies on a manifest that has none", async () => {
        const rootPath = `${rootDir}/package.json`;
        const originalRoot = await Bun.file(rootPath).text();
        const spec = platforms.find((p) => p.key === "linux-x64")!;
        const stagedManifestPath = `${distNpmDir}/${scopedPackageName(spec.key)}/package.json`;
        const stagedManifest = await scopedPackageManifest(spec, "0.0.0");
        await Bun.write(stagedManifestPath, `${JSON.stringify(stagedManifest, null, 4)}\n`);
        try {
            await stampVersion("9.9.9");

            const root = await Bun.file(rootPath).json() as {
                optionalDependencies?: Record<string, string>;
                version: string;
            };

            expect(root.version).toBe("9.9.9");
            expect(root.optionalDependencies).toEqual(
                Object.fromEntries(platforms.map((p) => [scopedPackageName(p.key), "9.9.9"])),
            );

            const manifest = await Bun.file(stagedManifestPath).json() as {version: string};
            expect(manifest.version).toBe("9.9.9");
        } finally {
            await Bun.write(rootPath, originalRoot);
        }
    });
});

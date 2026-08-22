import {afterEach, describe, expect, it} from "bun:test";
import {
    distNpmDir,
    hostPlatforms,
    classifyPublishAttempt,
    npmDistTag,
    npmPackumentUrl,
    parseBuildMode,
    planPublish,
    platforms,
    publishCwd,
    publishPlanIsEmpty,
    publishRetryWaitMs,
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
        const spec = {
            ...platforms.find((p) => p.key === "linux-arm64-musl")!,
            artifactName: "tsfmt-does-not-exist",
        };

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

    it("maps vX.Y.Z-alphaN to the matching package version", () => {
        process.env.CI_COMMIT_TAG = "v1.2.3-alpha1";
        expect(resolveReleaseVersion()).toBe("1.2.3-alpha1");
    });

    it("maps vX.Y.Z-betaN to the matching package version", () => {
        process.env.CI_COMMIT_TAG = "v2.0.0-beta2";
        expect(resolveReleaseVersion()).toBe("2.0.0-beta2");
    });

    it("maps vX.Y.Z-rcN to the matching package version", () => {
        process.env.CI_COMMIT_TAG = "v1.2.3-rc1";
        expect(resolveReleaseVersion()).toBe("1.2.3-rc1");
    });

    it("throws when CI_COMMIT_TAG is unset", () => {
        delete process.env.CI_COMMIT_TAG;
        expect(() => resolveReleaseVersion()).toThrow();
    });

    it("throws when CI_COMMIT_TAG is not a valid release tag", () => {
        process.env.CI_COMMIT_TAG = "not-a-version";
        expect(() => resolveReleaseVersion()).toThrow();
    });

    it("throws on a prerelease tag with no number", () => {
        process.env.CI_COMMIT_TAG = "v1.2.3-alpha";
        expect(() => resolveReleaseVersion()).toThrow();
    });

    it("throws on the dashed vX.Y.Z-rc-N tag form", () => {
        process.env.CI_COMMIT_TAG = "v1.2.3-rc-1";
        expect(() => resolveReleaseVersion()).toThrow();
    });
});

describe("npmDistTag", () => {
    it("uses latest for a stable version", () => {
        expect(npmDistTag("1.2.3")).toBe("latest");
    });

    it("uses alpha for an alphaN version", () => {
        expect(npmDistTag("1.2.3-alpha1")).toBe("alpha");
    });

    it("uses beta for a betaN version", () => {
        expect(npmDistTag("1.2.3-beta2")).toBe("beta");
    });

    it("uses rc for an rcN version", () => {
        expect(npmDistTag("1.2.3-rc1")).toBe("rc");
    });

    it("throws on a version that is not a release tag body", () => {
        expect(() => npmDistTag("1.2.3-rc-1")).toThrow();
    });
});

describe("publishCwd", () => {
    it("publishes the root package from the repo root", () => {
        expect(publishCwd()).toBe(rootDir);
    });

    it("publishes a platform package from its staged directory", () => {
        expect(publishCwd("dist-npm/@tsfmt/darwin-arm64")).toBe(`${rootDir}/dist-npm/@tsfmt/darwin-arm64`);
    });
});

describe("npmPackumentUrl", () => {
    it("builds a registry URL for the root package", () => {
        expect(npmPackumentUrl("tsfmt", "0.3.0-alpha3")).toBe(
            "https://registry.npmjs.org/tsfmt/0.3.0-alpha3",
        );
    });

    it("percent-encodes a scoped package name", () => {
        expect(npmPackumentUrl("@tsfmt/linux-x64", "0.3.0-alpha3")).toBe(
            "https://registry.npmjs.org/%40tsfmt%2Flinux-x64/0.3.0-alpha3",
        );
    });
});

describe("planPublish", () => {
    it("plans every package when none are on npm", async () => {
        const plan = await planPublish("0.3.0-alpha3", async () => false);
        expect(plan.publishRoot).toBe(true);
        expect(plan.rootName).toBe("tsfmt");
        expect(plan.targets).toEqual(platforms);
        expect(publishPlanIsEmpty(plan)).toBe(false);
    });

    it("plans nothing when every package is already on npm", async () => {
        const plan = await planPublish("0.3.0-alpha3", async () => true);
        expect(plan.publishRoot).toBe(false);
        expect(plan.targets).toEqual([]);
        expect(publishPlanIsEmpty(plan)).toBe(true);
    });

    it("omits platform packages that are already on npm", async () => {
        const exists = async (name: string) => name === "@tsfmt/linux-x64";
        const plan = await planPublish("0.3.0-alpha3", exists);
        expect(plan.targets.map((spec) => spec.key)).not.toContain("linux-x64");
        expect(plan.targets).toHaveLength(platforms.length - 1);
        expect(plan.publishRoot).toBe(true);
    });
});

describe("classifyPublishAttempt", () => {
    it("treats a zero exit as published", async () => {
        expect(await classifyPublishAttempt("tsfmt", "1.0.0", 0, async () => false)).toBe("published");
    });

    it("treats a failed publish as already-published when the version is now on npm", async () => {
        expect(await classifyPublishAttempt("@tsfmt/linux-x64", "1.0.0", 1, async () => true)).toBe(
            "already-published",
        );
    });

    it("retries a failed publish when the version is still missing", async () => {
        expect(await classifyPublishAttempt("@tsfmt/linux-x64", "1.0.0", 1, async () => false)).toBe("retry");
    });
});

describe("publishRetryWaitMs", () => {
    it("backs off by five seconds per attempt", () => {
        expect(publishRetryWaitMs(1)).toBe(5_000);
        expect(publishRetryWaitMs(2)).toBe(10_000);
        expect(publishRetryWaitMs(3)).toBe(15_000);
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

    it("writes a prerelease tag body onto the root package.json version", async () => {
        const rootPath = `${rootDir}/package.json`;
        const originalRoot = await Bun.file(rootPath).text();
        try {
            await stampVersion("1.2.3-rc1");

            const root = await Bun.file(rootPath).json() as {version: string};
            expect(root.version).toBe("1.2.3-rc1");
        } finally {
            await Bun.write(rootPath, originalRoot);
        }
    });
});
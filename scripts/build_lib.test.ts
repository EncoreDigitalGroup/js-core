import {describe, expect, it} from "bun:test";
import {genericPackageUrl, hostPlatforms, parseBuildMode, platforms} from "./build_lib";


describe("genericPackageUrl", () => {
    it("builds the public Generic Package URL from the repo remote", () => {
        const url = genericPackageUrl(
            "https://gitlab.encoredigitalgroup.com/oss/tsfmt.git",
            "1.2.3",
            "tsfmt-darwin-x64",
        );

        expect(url).toBe(
            "https://gitlab.encoredigitalgroup.com/api/v4/projects/oss%2Ftsfmt/packages/generic/tsfmt/1.2.3/tsfmt-darwin-x64",
        );
    });
});

describe("platforms", () => {
    it("covers eight compile targets", () => {
        expect(platforms).toHaveLength(8);
    });

    it("resolves at least one host target", () => {
        expect(hostPlatforms().length).toBeGreaterThan(0);
    });
});

describe("parseBuildMode", () => {
    it("emits types and compiles the host by default", () => {
        expect(parseBuildMode([])).toEqual({
            allPlatforms: false,
            compile: true,
            emitTypes: true,
            upload: false,
        });
    });

    it("compiles every platform with --all", () => {
        expect(parseBuildMode(["--all"])).toEqual({
            allPlatforms: true,
            compile: true,
            emitTypes: true,
            upload: false,
        });
    });

    it("emits types only with --types-only", () => {
        expect(parseBuildMode(["--types-only"])).toEqual({
            allPlatforms: false,
            compile: false,
            emitTypes: true,
            upload: false,
        });
    });

    it("uploads existing binaries with --upload", () => {
        expect(parseBuildMode(["--upload"])).toEqual({
            allPlatforms: false,
            compile: false,
            emitTypes: false,
            upload: true,
        });
    });

    it("compiles every platform and uploads with --all --upload", () => {
        expect(parseBuildMode(["--all", "--upload"])).toEqual({
            allPlatforms: true,
            compile: true,
            emitTypes: true,
            upload: true,
        });
    });
});

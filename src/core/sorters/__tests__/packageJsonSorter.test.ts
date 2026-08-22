/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import fs from "fs";
import path from "path";
import {DefaultSortOptions} from "../../../shared";
import {sortPackageJsonObject} from "../packageJsonSorter";

function serialized(obj: Record<string, any>, sortOrder?: string[]): string {
    const opts = sortOrder ? {sortOrder} : {};
    return JSON.stringify(sortPackageJsonObject(structuredClone(obj), opts), null, 2);
}

/*
 * Regression guard for the package.json sorter. The `expected` fixtures below pin the exact key
 * ordering the sorter must produce. Comparison is on serialized JSON so key order is significant
 * (toEqual would ignore it).
 */
const customSortOrder = DefaultSortOptions.customSortOrder;
const expectedNestedCustom = {
    name: "cfg",
    config: {a: 2, z: 1},
    jest: {bail: false, verbose: true},
    peerDependencies: {"@types/node": "^22", react: "^18"},
    optionalDependencies: {fsevents: "^2"},
};

const expectedSampleCustom = {
    name: "demo",
    author: {name: "A", email: "a@example.com", url: "https://a.example"},
    version: "1.0.0",
    publishConfig: {access: "public", registry: "https://npm"},
    keywords: ["b", "a"],
    engines: {node: ">=22", npm: ">=9"},
    dependencies: {beta: "^2", gamma: "^1"},
    devDependencies: {"@scope/pkg": "^2", alpha: "^3", zebra: "^1"},
    scripts: {
        prebuild: "echo start",
        build: "tsc",
        postbuild: "echo done",
        "build:prod": "tsc -p prod",
        "build:watch": "tsc -w",
        test: "bun test",
    },
    exports: {".": {require: "./i.cjs", types: "./i.d.ts", import: "./i.js"}},
    files: ["dist", "README.md"],
    repository: {type: "git", url: "git+https://example.com/x.git"},
    bugs: {url: "https://example.com/issues", email: "b@example.com"},
    license: "MIT",
    bin: {atool: "./a.js", ztool: "./z.js"},
    unknownFieldA: 2,
    unknownFieldZ: 1,
    _abc: "y",
    _private: "x",
};

const expectedSampleDefault = {
    name: "demo",
    version: "1.0.0",
    keywords: ["b", "a"],
    bugs: {url: "https://example.com/issues", email: "b@example.com"},
    repository: {type: "git", url: "git+https://example.com/x.git"},
    license: "MIT",
    author: {name: "A", email: "a@example.com", url: "https://a.example"},
    exports: {".": {require: "./i.cjs", types: "./i.d.ts", import: "./i.js"}},
    bin: {atool: "./a.js", ztool: "./z.js"},
    files: ["dist", "README.md"],
    scripts: {
        prebuild: "echo start",
        build: "tsc",
        postbuild: "echo done",
        "build:prod": "tsc -p prod",
        "build:watch": "tsc -w",
        test: "bun test",
    },
    dependencies: {beta: "^2", gamma: "^1"},
    devDependencies: {"@scope/pkg": "^2", alpha: "^3", zebra: "^1"},
    engines: {node: ">=22", npm: ">=9"},
    publishConfig: {access: "public", registry: "https://npm"},
    unknownFieldA: 2,
    unknownFieldZ: 1,
    _abc: "y",
    _private: "x",
};

const nested = {
    name: "cfg",
    jest: {verbose: true, bail: false},
    config: {z: 1, a: 2},
    peerDependencies: {react: "^18", "@types/node": "^22"},
    optionalDependencies: {fsevents: "^2"},
};

const sample = {
    license: "MIT",
    bin: {ztool: "./z.js", atool: "./a.js"},
    name: "demo",
    version: "1.0.0",
    _private: "x",
    _abc: "y",
    keywords: ["b", "a", "b"],
    files: ["dist", "README.md", "dist"],
    repository: {url: "git+https://example.com/x.git", type: "git"},
    bugs: {email: "b@example.com", url: "https://example.com/issues"},
    devDependencies: {zebra: "^1", "@scope/pkg": "^2", alpha: "^3"},
    dependencies: {gamma: "^1", beta: "^2"},
    scripts: {
        postbuild: "echo done",
        build: "tsc",
        prebuild: "echo start",
        "build:watch": "tsc -w",
        test: "bun test",
        "build:prod": "tsc -p prod",
    },
    engines: {npm: ">=9", node: ">=22"},
    publishConfig: {registry: "https://npm", access: "public"},
    exports: {".": {require: "./i.cjs", types: "./i.d.ts", import: "./i.js"}},
    author: {url: "https://a.example", name: "A", email: "a@example.com"},
    unknownFieldZ: 1,
    unknownFieldA: 2,
};

describe("packageJsonSorter", () => {
    it("orders fields by tsfmt's customSortOrder", () => {
        expect(serialized(sample, customSortOrder)).toBe(JSON.stringify(expectedSampleCustom, null, 2));
    });

    it("orders fields by the canonical default order", () => {
        expect(serialized(sample)).toBe(JSON.stringify(expectedSampleDefault, null, 2));
    });

    it("alphabetizes nested config and dependency objects", () => {
        expect(serialized(nested, customSortOrder)).toBe(JSON.stringify(expectedNestedCustom, null, 2));
    });

    it("is idempotent on the repo's own package.json", () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
        const once = sortPackageJsonObject(structuredClone(pkg), {sortOrder: customSortOrder});
        const twice = sortPackageJsonObject(structuredClone(once), {sortOrder: customSortOrder});
        expect(JSON.stringify(twice, null, 2)).toBe(JSON.stringify(once, null, 2));
    });
});
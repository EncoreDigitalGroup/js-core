#!/usr/bin/env node

const {spawnSync} = require("node:child_process");

const platformTargets = [
    {arch: "arm64", key: "darwin-arm64", platform: "darwin"},
    {arch: "x64", key: "darwin-x64", platform: "darwin"},
    {arch: "x64", key: "linux-x64", musl: false, platform: "linux"},
    {arch: "x64", key: "linux-x64-musl", musl: true, platform: "linux"},
    {arch: "arm64", key: "linux-arm64", musl: false, platform: "linux"},
    {arch: "arm64", key: "linux-arm64-musl", musl: true, platform: "linux"},
    {arch: "x64", key: "win32-x64", platform: "win32"},
    {arch: "arm64", key: "win32-arm64", platform: "win32"},
];

const platformKeys = platformTargets.map((target) => target.key);

function isMusl() {
    if (process.platform !== "linux") {
        return false;
    }
    try {
        return spawnSync("ldd", ["--version"], {encoding: "utf8"}).output.join("").includes("musl");
    } catch {
        return false;
    }
}

function platformKey(platform, arch, musl) {
    const target = platformTargets.find(
        (candidate) => candidate.platform === platform
            && candidate.arch === arch
            && (candidate.musl === undefined || candidate.musl === musl),
    );

    if (!target) {
        throw new Error(`tsfmt has no binary for ${platform}-${arch}`);
    }

    return target.key;
}

function resolveBinary() {
    if (process.env.TSFMT_BINARY_PATH) {
        return process.env.TSFMT_BINARY_PATH;
    }

    const key = platformKey(process.platform, process.arch, isMusl());
    const binName = process.platform === "win32" ? "tsfmt.exe" : "tsfmt";
    const packageName = `@tsfmt/${key}`;

    try {
        return require.resolve(`${packageName}/bin/${binName}`);
    } catch {
        throw new Error(
            `tsfmt: could not find the optional dependency "${packageName}". ` +
            "This usually means optional dependencies were not installed (e.g. `npm install --omit=optional` " +
            "or `--no-optional`). Reinstall without omitting optional dependencies to fix this.",
        );
    }
}

function run() {
    const binary = resolveBinary();
    const result = spawnSync(binary, process.argv.slice(2), {stdio: "inherit"});
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    process.exit(result.status ?? 1);
}

if (require.main === module) {
    try {
        run();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports.platformKey = platformKey;
module.exports.platformKeys = platformKeys;

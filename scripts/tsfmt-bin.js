#!/usr/bin/env node

const {spawnSync} = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const pkg = require("../package.json");

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

function artifactName() {
    const {arch, platform} = process;
    if (platform === "darwin" && arch === "arm64") {
        return "tsfmt-darwin-arm64";
    }
    if (platform === "darwin" && arch === "x64") {
        return "tsfmt-darwin-x64";
    }
    if (platform === "linux" && arch === "x64") {
        return isMusl() ? "tsfmt-linux-x64-musl" : "tsfmt-linux-x64";
    }
    if (platform === "linux" && arch === "arm64") {
        return isMusl() ? "tsfmt-linux-arm64-musl" : "tsfmt-linux-arm64";
    }
    if (platform === "win32" && arch === "x64") {
        return "tsfmt-win32-x64.exe";
    }
    if (platform === "win32" && arch === "arm64") {
        return "tsfmt-win32-arm64.exe";
    }
    throw new Error(`tsfmt has no binary for ${platform}-${arch}`);
}

function downloadUrl(fileName) {
    const repo = pkg.repository.url.replace(/\.git$/, "");
    const parsed = new URL(repo);
    const project = parsed.pathname.replace(/^\//, "");
    return `${parsed.origin}/api/v4/projects/${encodeURIComponent(project)}/packages/generic/tsfmt/${pkg.version}/${fileName}`;
}

function cachePath(fileName) {
    const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
    return path.join(base, "tsfmt", pkg.version, fileName);
}

function localBuildPath(fileName) {
    return path.join(__dirname, "..", "binaries", fileName);
}

async function ensureBinary() {
    if (process.env.TSFMT_BINARY_PATH) {
        return process.env.TSFMT_BINARY_PATH;
    }
    const name = artifactName();
    const local = localBuildPath(name);
    if (fs.existsSync(local)) {
        return local;
    }
    const cached = cachePath(name);
    if (fs.existsSync(cached)) {
        return cached;
    }
    const url = downloadUrl(name);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`tsfmt: failed to download ${name} (${response.status}): ${url}`);
    }
    fs.mkdirSync(path.dirname(cached), {recursive: true});
    const tmp = `${cached}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(await response.arrayBuffer()));
    fs.chmodSync(tmp, 0o755);
    fs.renameSync(tmp, cached);
    return cached;
}

ensureBinary().then((binary) => {
    const result = spawnSync(binary, process.argv.slice(2), {stdio: "inherit"});
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    process.exit(result.status ?? 1);
}).catch((error) => {
    console.error(error.message);
    process.exit(1);
});

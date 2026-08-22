import {
    compileStandaloneBinaries,
    emitDeclarationFiles,
    loadPackageJson,
    parseBuildMode,
    publishPackages,
    resolveReleaseVersion,
    selectCompileTargets,
    stageScopedPackages,
    stampVersion,
} from "./build_lib";

const mode = parseBuildMode(process.argv.slice(2));

await emitDeclarationFiles();

if (mode.kind !== "types-only") {
    const targets = selectCompileTargets(mode.kind === "publish" ? true : mode.allPlatforms);
    await compileStandaloneBinaries(targets);

    const version = mode.kind === "publish"
        ? resolveReleaseVersion()
        : (await loadPackageJson()).version;

    if (mode.kind === "publish") {
        await stampVersion(version);
    }

    await stageScopedPackages(targets, version);

    if (mode.kind === "publish") {
        await publishPackages(version);
    }
}

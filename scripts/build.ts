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

    const pkg = await loadPackageJson();
    await stageScopedPackages(targets, pkg.version);

    if (mode.kind === "publish") {
        const version = resolveReleaseVersion();
        await stampVersion(version);
        await publishPackages(version);
    }
}

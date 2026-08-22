import {
    compileStandaloneBinaries,
    emitDeclarationFiles,
    loadPackageJson,
    parseBuildMode,
    planPublish,
    publishPackages,
    publishPlanIsEmpty,
    resolveReleaseVersion,
    selectCompileTargets,
    stageScopedPackages,
    stampVersion,
} from "./build_lib";

const mode = parseBuildMode(process.argv.slice(2));
if (mode.kind === "types-only") {
    await emitDeclarationFiles();
} else if (mode.kind === "publish") {
    const version = resolveReleaseVersion();
    const plan = await planPublish(version);
    if (publishPlanIsEmpty(plan)) {
        console.log(`All packages already published at ${version}; skipping`);
    } else {
        if (plan.publishRoot) {
            await emitDeclarationFiles();
        }

        if (plan.targets.length > 0) {
            await compileStandaloneBinaries(plan.targets);
        }

        await stampVersion(version);
        await stageScopedPackages(plan.targets, version);
        await publishPackages(version, plan);
    }
} else {
    await emitDeclarationFiles();

    const targets = selectCompileTargets(mode.allPlatforms);
    await compileStandaloneBinaries(targets);

    const pkg = await loadPackageJson();
    await stageScopedPackages(targets, pkg.version);
}

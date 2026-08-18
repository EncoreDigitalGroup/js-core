import {
    compileStandaloneBinaries,
    emitDeclarationFiles,
    parseBuildMode,
    publishBinariesToGitLab,
    selectCompileTargets,
} from "./build_lib";


const mode = parseBuildMode(process.argv.slice(2));

if (mode.emitTypes) {
    await emitDeclarationFiles();
}

if (mode.compile) {
    await compileStandaloneBinaries(selectCompileTargets(mode.allPlatforms));
}

if (mode.upload) {
    await publishBinariesToGitLab();
}

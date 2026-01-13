"use strict";
const fs = require("fs");
const glob = require("glob");
const path = require("path");
require("reflect-metadata");
require("typescript");
require("./core/config/ConfigDefaults.js");
const ConfigLoader = require("./core/config/ConfigLoader.js");
const Container = require("./core/di/Container.js");
const ServiceRegistration = require("./core/di/ServiceRegistration.js");
require("fs/promises");
const sortPackage = require("./sortPackage.js");
const sortTSConfig = require("./sortTSConfig.js");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const glob__namespace = /* @__PURE__ */ _interopNamespaceDefault(glob);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
async function formatFiles(targetDir, config, dryRun) {
  const container = new Container.Container();
  ServiceRegistration.ServiceRegistration.registerServices(container, config);
  const include = config.sorting?.include || ["**/*.{ts,tsx,js,jsx}"];
  const exclude = config.sorting?.exclude || [];
  const criticalExcludes = ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"];
  const finalExclude = [.../* @__PURE__ */ new Set([...exclude, ...criticalExcludes])];
  const files = include.flatMap((pattern) => glob__namespace.sync(pattern, {
    cwd: targetDir,
    ignore: finalExclude,
    absolute: true
  }));
  if (files.length === 0) {
    console.info("No files found to format.");
    return;
  }
  console.info(`Formatting ${files.length} files...`);
  const pipeline = container.resolve("FormatterPipeline");
  let formattedCount = 0;
  for (const file of files) {
    try {
      const context = await pipeline.formatFile(file, dryRun);
      if (context.changed) {
        formattedCount++;
        if (!dryRun) {
          console.log(`📊  Formatted: ${path__namespace.relative(targetDir, file)}`);
        }
      }
    } catch (error) {
      console.error(`Error formatting file ${file}:`, error.message);
    }
  }
  if (dryRun) {
    console.info(`Would format ${formattedCount} of ${files.length} files.`);
  } else {
    console.info(`Formatted ${formattedCount} of ${files.length} files.`);
  }
}
async function main() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry") {
      dryRun = true;
    } else if (!arg.startsWith("-")) {
      targetDir = path__namespace.resolve(arg);
    } else {
      console.error(`Error: Unsupported option "${arg}". Only --dry is supported.`);
      process.exit(1);
    }
  }
  try {
    const config = ConfigLoader.ConfigLoader.loadConfig(targetDir);
    if (ConfigLoader.ConfigLoader.hasConfigFile(targetDir)) {
      console.log("Using custom configuration from tsfmt.config.ts");
    }
    if (config.packageJson?.enabled) {
      const packagePath = path__namespace.join(targetDir, "package.json");
      if (fs__namespace.existsSync(packagePath)) {
        console.log(`📦  Processing ${packagePath}...`);
        sortPackage.sortPackageFile(packagePath, {
          customSortOrder: config.packageJson.customSortOrder,
          indentation: config.packageJson.indentation,
          dryRun
        });
      }
    }
    if (config.tsConfig?.enabled) {
      const tsconfigPath = path__namespace.join(targetDir, "tsconfig.json");
      if (fs__namespace.existsSync(tsconfigPath)) {
        console.log(`🔧  Processing ${tsconfigPath}...`);
        sortTSConfig.sortTsConfigFile(tsconfigPath, {
          indentation: config.tsConfig.indentation,
          dryRun
        });
      }
    }
    if (config.codeStyle?.enabled || config.imports?.enabled || config.sorting?.enabled || config.spacing?.enabled) {
      await formatFiles(targetDir, config, dryRun);
    }
    if (dryRun) {
      console.info("Dry run completed. No files were modified.");
    } else {
      console.info("Formatting completed successfully.");
    }
  } catch (error) {
    console.error("Error during formatting:", error.message);
    process.exit(1);
  }
}
main();

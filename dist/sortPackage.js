"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const sortPackageJson$1 = require("sort-package-json");
const _package = require("./formatters/package.js");
const types = require("./shared/types.js");
function sortPackageJson(packageObj, options = {}) {
  const sortOrder = options.customSortOrder || types.DefaultSortOptions.customSortOrder;
  let sortedPackage = sortPackageJson$1.sortPackageJson(packageObj, {
    sortOrder
  });
  if (sortedPackage.exports) {
    sortedPackage.exports = _package.sortExportsKeys(sortedPackage.exports);
  }
  return sortedPackage;
}
function sortPackageFile(filePath, options = {}) {
  const packagePath = filePath || path.join(process.cwd(), "package.json");
  const indentation = options.indentation || types.DefaultSortOptions.indentation;
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const sortedPackageJson = sortPackageJson(packageJson, options);
    if (!options.dryRun) {
      fs.writeFileSync(packagePath, JSON.stringify(sortedPackageJson, null, indentation) + "\n");
    }
    return sortedPackageJson;
  } catch (error) {
    console.error(`Error processing ${packagePath}:`, error);
    throw error;
  }
}
exports.sortPackageFile = sortPackageFile;
exports.sortPackageJson = sortPackageJson;

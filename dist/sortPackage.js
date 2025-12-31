"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortPackageFile = sortPackageFile;
exports.sortPackageJson = sortPackageJson;
const package_1 = require("./formatters/package");
const types_1 = require("./shared/types");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sort_package_json_1 = require("sort-package-json");
function sortPackageFile(filePath, options = {}) {
    const packagePath = filePath || path_1.default.join(process.cwd(), "package.json");
    const indentation = options.indentation || types_1.DefaultSortOptions.indentation;
    try {
        const packageJson = JSON.parse(fs_1.default.readFileSync(packagePath, "utf8"));
        const sortedPackageJson = sortPackageJson(packageJson, options);
        if (!options.dryRun) {
            fs_1.default.writeFileSync(packagePath, JSON.stringify(sortedPackageJson, null, indentation) + "\n");
            console.log(`✨ ${packagePath} has been sorted successfully!`);
        }
        return sortedPackageJson;
    }
    catch (error) {
        console.error(`Error processing ${packagePath}:`, error);
        throw error;
    }
}
function sortPackageJson(packageObj, options = {}) {
    const sortOrder = options.customSortOrder || types_1.DefaultSortOptions.customSortOrder;
    let sortedPackage = (0, sort_package_json_1.sortPackageJson)(packageObj, {
        sortOrder,
    });
    if (sortedPackage.exports) {
        sortedPackage.exports = (0, package_1.sortExportsKeys)(sortedPackage.exports);
    }
    return sortedPackage;
}

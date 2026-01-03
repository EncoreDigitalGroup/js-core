/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {__sortExportsKeys} from "./formatters/package";
import {SortOptions, DefaultSortOptions} from "./shared/types";
import fs from "fs";
import path from "path";
import {sortPackageJson as baseSortPackageJson} from "sort-package-json";

export function __sortPackageJson(packageObj: Record<string, any>, options: SortOptions = {}): Record<string, any> {
    const sortOrder = options.customSortOrder || DefaultSortOptions.customSortOrder;
    // Sort using the base library first
    let sortedPackage = baseSortPackageJson(packageObj, {
        sortOrder,
    });
    if (sortedPackage.exports) {
        sortedPackage.exports = __sortExportsKeys(sortedPackage.exports);
    }

    return sortedPackage;
}

export function __sortPackageFile(filePath?: string, options: SortOptions = {}): Record<string, any> {
    const packagePath = filePath || path.join(process.cwd(), "package.json");
    const indentation = options.indentation || (DefaultSortOptions.indentation as number);
    try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        const sortedPackageJson = __sortPackageJson(packageJson, options);
        if (!options.dryRun) {
            fs.writeFileSync(packagePath, JSON.stringify(sortedPackageJson, null, indentation) + "\n");
            console.log(`✨ ${packagePath} has been sorted successfully!`);
        }

        return sortedPackageJson;
    } catch (error) {
        console.error(`Error processing ${packagePath}:`, error);
        throw error;
    }
}

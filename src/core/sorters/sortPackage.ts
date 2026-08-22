/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import {sortExportsKeys} from "../../formatters";
import {DefaultSortOptions, SortOptions} from "../../shared";
import {sortPackageJsonObject} from "./packageJsonSorter";

export function sortPackageJson(packageObj: Record<string, any>, options: SortOptions = {}): Record<string, any> {
    const sortOrder = options.customSortOrder || DefaultSortOptions.customSortOrder;

    // Order the top-level fields first
    let sortedPackage = sortPackageJsonObject(packageObj, {
        sortOrder,
    });

    if (sortedPackage.exports) {
        sortedPackage.exports = sortExportsKeys(sortedPackage.exports);
    }

    return sortedPackage;
}

export function sortPackageFile(filePath?: string, options: SortOptions = {}): Record<string, any> {
    const packagePath = filePath || path.join(process.cwd(), "package.json");
    const indentation = options.indentation || (DefaultSortOptions.indentation as number);
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
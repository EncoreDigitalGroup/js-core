/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {DefaultSortOptions, SortOptions} from "./shared/types";
import fs from "fs";
import path from "path";

function sortObjectKeysAlphabetically(obj: Record<string, any>): Record<string, any> {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
        return obj;
    }

    return Object.keys(obj)
        .sort()
        .reduce(
            (result, key) => {
                result[key] = sortObjectKeysAlphabetically(obj[key]);
                return result;
            },
            {} as Record<string, any>,
        );
}

export function sortTsConfig(tsConfig: Record<string, any>): Record<string, any> {
    return sortObjectKeysAlphabetically(tsConfig);
}

export function sortTsConfigFile(filePath?: string, options: SortOptions = {}): Record<string, any> {
    const tsConfigPath = filePath || path.join(process.cwd(), "tsconfig.json");
    const indentation = options.indentation || (DefaultSortOptions.indentation as number);

    try {
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf8"));
        const sortedTsConfig = sortTsConfig(tsConfig);

        if (!options.dryRun) {
            fs.writeFileSync(tsConfigPath, JSON.stringify(sortedTsConfig, null, indentation) + "\n");
            console.log(`✨ ${tsConfigPath} has been sorted alphabetically!`);
        }

        return sortedTsConfig;
    } catch (error) {
        console.error(`Error processing ${tsConfigPath}:`, error);
        throw error;
    }
}

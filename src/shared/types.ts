/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
export interface SortOptions {
    customSortOrder?: string[];
    indentation?: number;
    filePath?: string;
    dryRun?: boolean;
}

export const DefaultSortOptions: SortOptions = {
    customSortOrder: [
        "name",
        "type",
        "author",
        "version",
        "description",
        "publishConfig",
        "keywords",
        "homepage",
        "engines",
        "dependencies",
        "devDependencies",
        "scripts",
        "types",
        "main",
        "module",
        "exports",
        "files",
        "repository",
        "bugs",
    ],
    indentation: 4,
    dryRun: false,
};

/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
export function sortExportsKeys(exports: Record<string, any>): Record<string, any> {
    if (!exports || typeof exports !== "object") {
        return exports;
    }

    const sortedExports: Record<string, any> = {};
    const exportKeyOrder = ["types", "import", "require"];

    for (const [key, value] of Object.entries(exports)) {
        if (Array.isArray(value)) {
            // A subpath target can be a fallback array (e.g. "./*": ["./x.ts", "./x.tsx", "./x"]).
            // It is an ordered list, not a conditions object — copy it through untouched. Treating it
            // as an object would reserialize it into {"0":…,"1":…}, corrupting the exports map.
            sortedExports[key] = value;
        } else if (typeof value === "object" && value !== null) {
            const sortedSubObject: Record<string, any> = {};

            exportKeyOrder.forEach(subKey => {
                if (subKey in value) {
                    sortedSubObject[subKey] = value[subKey];
                }
            });

            for (const subKey of Object.keys(value)) {
                if (!exportKeyOrder.includes(subKey)) {
                    sortedSubObject[subKey] = value[subKey];
                }
            }

            sortedExports[key] = sortedSubObject;
        } else {
            sortedExports[key] = value;
        }
    }

    return sortedExports;
}
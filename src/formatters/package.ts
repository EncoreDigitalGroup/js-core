/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
export function __sortExportsKeys(exports: Record<string, any>): Record<string, any> {
    if (!exports || typeof exports !== "object") {
        return exports;
    }
    const sortedExports: Record<string, any> = {};
    const exportKeyOrder = ["types", "import", "require"];
    for (const [key, value] of Object.entries(exports)) {
        if (typeof value === "object" && value !== null) {
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

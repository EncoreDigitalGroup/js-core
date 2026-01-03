"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__sortExportsKeys = __sortExportsKeys;
function __sortExportsKeys(exports) {
    if (!exports || typeof exports !== "object") {
        return exports;
    }
    const sortedExports = {};
    const exportKeyOrder = ["types", "import", "require"];
    for (const [key, value] of Object.entries(exports)) {
        if (typeof value === "object" && value !== null) {
            const sortedSubObject = {};
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
        }
        else {
            sortedExports[key] = value;
        }
    }
    return sortedExports;
}

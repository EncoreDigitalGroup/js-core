"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTsConfig = sortTsConfig;
function sortObjectKeysAlphabetically(obj) {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
        return obj;
    }
    return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
        result[key] = sortObjectKeysAlphabetically(obj[key]);
        return result;
    }, {});
}
function sortTsConfig(tsConfig) {
    return sortObjectKeysAlphabetically(tsConfig);
}

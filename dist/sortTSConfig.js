"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__sortTsConfig = __sortTsConfig;
exports.__sortTsConfigFile = __sortTsConfigFile;
const types_1 = require("./shared/types");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
function __sortTsConfig(tsConfig) {
    return sortObjectKeysAlphabetically(tsConfig);
}
function __sortTsConfigFile(filePath, options = {}) {
    const tsConfigPath = filePath || path_1.default.join(process.cwd(), "tsconfig.json");
    const indentation = options.indentation || types_1.DefaultSortOptions.indentation;
    try {
        const tsConfig = JSON.parse(fs_1.default.readFileSync(tsConfigPath, "utf8"));
        const sortedTsConfig = __sortTsConfig(tsConfig);
        if (!options.dryRun) {
            fs_1.default.writeFileSync(tsConfigPath, JSON.stringify(sortedTsConfig, null, indentation) + "\n");
            console.log(`✨ ${tsConfigPath} has been sorted alphabetically!`);
        }
        return sortedTsConfig;
    }
    catch (error) {
        console.error(`Error processing ${tsConfigPath}:`, error);
        throw error;
    }
}

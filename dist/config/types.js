"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.__mergeConfig = __mergeConfig;
exports.configure = configure;
const file_1 = require("../formatters/file");
const react_1 = require("../formatters/react");
const classMemberTypes_1 = require("../shared/classMemberTypes");
const types_1 = require("../shared/types");
function __deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === "object" &&
                source[key] !== null &&
                !Array.isArray(source[key]) &&
                typeof result[key] === "object" &&
                result[key] !== null &&
                !Array.isArray(result[key])) {
                result[key] = __deepMerge(result[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
    }
    return result;
}
exports.defaultConfig = {
    debug: false,
    prettier: {
        enabled: true,
        skipIfConfigExists: true,
        options: {
            plugins: ["@trivago/prettier-plugin-sort-imports"],
            bracketSpacing: false,
            trailingComma: "all",
            arrowParens: "avoid",
            tabWidth: 4,
            editorconfig: true,
            useTabs: false,
            printWidth: 120,
            importOrderSeparation: true,
            singleQuote: false,
            semi: true,
        },
        include: ["**/*.{js,ts,jsx,tsx}"],
        exclude: ["node_modules/**", "dist/**", "vendor/**", "bin/**"],
    },
    packageJson: {
        enabled: true,
        customSortOrder: types_1.DefaultSortOptions.customSortOrder,
        indentation: 4,
    },
    tsConfig: {
        enabled: true,
        indentation: 4,
    },
    sorters: {
        classMembers: {
            enabled: true,
            order: classMemberTypes_1.DEFAULT_CLASS_ORDER,
            groupByVisibility: false,
            respectDependencies: true,
        },
        reactComponents: {
            enabled: true,
            order: react_1.DEFAULT_REACT_ORDER,
            groupByVisibility: false,
            respectDependencies: true,
        },
        fileDeclarations: {
            enabled: true,
            order: file_1.DEFAULT_FILE_ORDER,
            respectDependencies: true,
        },
        include: ["**/*.{ts,tsx}"],
        exclude: ["node_modules/**", "dist/**", "vendor/**", "bin/**"],
    },
};
function __mergeConfig(userConfig) {
    return __deepMerge(exports.defaultConfig, userConfig);
}
function configure(config) {
    return __mergeConfig(config);
}

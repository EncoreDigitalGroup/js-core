"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const types = require("./shared/types.js");
function sortObjectKeysAlphabetically(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = sortObjectKeysAlphabetically(obj[key]);
    return result;
  }, {});
}
function sortTsConfig(tsConfig) {
  return sortObjectKeysAlphabetically(tsConfig);
}
function sortTsConfigFile(filePath, options = {}) {
  const tsConfigPath = filePath || path.join(process.cwd(), "tsconfig.json");
  const indentation = options.indentation || types.DefaultSortOptions.indentation;
  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf8"));
    const sortedTsConfig = sortTsConfig(tsConfig);
    if (!options.dryRun) {
      fs.writeFileSync(tsConfigPath, JSON.stringify(sortedTsConfig, null, indentation) + "\n");
    }
    return sortedTsConfig;
  } catch (error) {
    console.error(`Error processing ${tsConfigPath}:`, error);
    throw error;
  }
}
exports.sortTsConfig = sortTsConfig;
exports.sortTsConfigFile = sortTsConfigFile;

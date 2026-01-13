"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ConfigDefaults = require("./ConfigDefaults.js");
class ConfigMerger {
  /**
  * Deep merge two configuration objects
  * @param target - Target configuration (defaults)
  * @param source - Source configuration (user overrides)
  * @returns Merged configuration
  */
  static deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== void 0) {
        if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key]) && typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }
  /**
  * Merge user config with default config
  * @param userConfig - Partial user configuration
  * @returns Complete merged configuration
  */
  static merge(userConfig) {
    return this.deepMerge(ConfigDefaults.ConfigDefaults.getDefaultConfig(), userConfig);
  }
  /**
  * Merge multiple partial configs together
  * @param configs - Array of partial configurations to merge
  * @returns Merged configuration
  */
  static mergeMultiple(...configs) {
    let result = ConfigDefaults.ConfigDefaults.getDefaultConfig();
    for (const config of configs) {
      result = this.deepMerge(result, config);
    }
    return result;
  }
}
exports.ConfigMerger = ConfigMerger;

"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ConfigTypes = require("./ConfigTypes.js");
class ConfigValidator {
  /**
  * Validate a CoreConfig object
  * @param config - Configuration to validate
  * @returns Validation result with errors and warnings
  */
  static validate(config) {
    const errors = [];
    const warnings = [];
    if (config.codeStyle) {
      if (config.codeStyle.enabled && config.codeStyle.quoteStyle) {
        if (!ConfigTypes.ConfigTypes.isValidQuoteStyle(config.codeStyle.quoteStyle)) {
          errors.push(`Invalid quoteStyle: ${config.codeStyle.quoteStyle}. Must be ${ConfigTypes.ConfigTypes.getQuoteStyleOptions().map((s) => `'${s}'`).join(" or ")}.`);
        }
      }
      if (config.codeStyle.enabled && config.codeStyle.semicolons) {
        if (!ConfigTypes.ConfigTypes.isValidSemicolonOption(config.codeStyle.semicolons)) {
          errors.push(`Invalid semicolons: ${config.codeStyle.semicolons}. Must be ${ConfigTypes.ConfigTypes.getSemicolonOptions().map((s) => `'${s}'`).join(" or ")}.`);
        }
      }
      if (config.codeStyle.indentWidth !== void 0) {
        if (!ConfigTypes.ConfigTypes.isValidIndentWidth(config.codeStyle.indentWidth)) {
          errors.push(`Invalid indentWidth: ${config.codeStyle.indentWidth}. Must be between 1 and 8.`);
        }
      }
      if (config.codeStyle.lineWidth !== void 0) {
        if (config.codeStyle.lineWidth < 40 || config.codeStyle.lineWidth > 200) {
          if (!ConfigTypes.ConfigTypes.isRecommendedLineWidth(config.codeStyle.lineWidth)) {
            warnings.push(`Unusual lineWidth: ${config.codeStyle.lineWidth}. Recommended range is 80-120.`);
          }
        }
      }
    }
    if (config.imports) {
      if (config.imports.groupOrder && config.imports.groupOrder.length > 0) {
        const validGroups = ConfigTypes.ConfigTypes.getImportGroupOptions();
        const invalidGroups = config.imports.groupOrder.filter((g) => !validGroups.includes(g));
        if (invalidGroups.length > 0) {
          errors.push(`Invalid group in groupOrder: ${invalidGroups.join(", ")}. Valid groups: ${validGroups.join(", ")}`);
        }
      }
    }
    if (config.sorting) {
      if (config.sorting.include && config.sorting.include.length === 0) {
        warnings.push("Sorting include patterns is empty - no files will be sorted.");
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  /**
  * Validate and throw if invalid
  * @param config - Configuration to validate
  * @throws Error if configuration is invalid
  */
  static validateOrThrow(config) {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(`Invalid configuration:
${result.errors.join("\n")}`);
    }
    if (result.warnings.length > 0) {
      console.warn("Configuration warnings:");
      result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }
  }
}
exports.ConfigValidator = ConfigValidator;

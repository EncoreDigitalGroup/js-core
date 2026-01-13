"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var FormatterOrder = /* @__PURE__ */ ((FormatterOrder2) => {
  FormatterOrder2["IndexGeneration"] = "IndexGeneration";
  FormatterOrder2["CodeStyle"] = "CodeStyle";
  FormatterOrder2["ImportOrganization"] = "ImportOrganization";
  FormatterOrder2["ASTTransformation"] = "ASTTransformation";
  FormatterOrder2["Spacing"] = "Spacing";
  return FormatterOrder2;
})(FormatterOrder || {});
class ConfigTypes {
  /** Get all available arrow parentheses options */
  static getArrowParenOptions() {
    return ["always", "avoid"];
  }
  /** Get all formatter order options */
  static getFormatterOrderOptions() {
    return Object.values(FormatterOrder);
  }
  /** Get all available import group options */
  static getImportGroupOptions() {
    return ["external", "internal", "relative"];
  }
  /** Get all available indent style options */
  static getIndentStyleOptions() {
    return ["tab", "space"];
  }
  /** Get all available quote style options */
  static getQuoteStyleOptions() {
    return ["single", "double"];
  }
  /** Get all available semicolon options */
  static getSemicolonOptions() {
    return ["always", "never"];
  }
  /** Get all available trailing comma options */
  static getTrailingCommaOptions() {
    return ["none", "es5", "all"];
  }
  /** Check if a line width is in recommended range */
  static isRecommendedLineWidth(width) {
    return width >= 80 && width <= 120;
  }
  /** Validate an arrow parentheses option */
  static isValidArrowParenOption(option) {
    return this.getArrowParenOptions().includes(option);
  }
  /** Validate an indent style option */
  static isValidIndentStyle(style) {
    return this.getIndentStyleOptions().includes(style);
  }
  /** Check if an indent width is valid */
  static isValidIndentWidth(width) {
    return width >= 1 && width <= 8;
  }
  /** Validate a quote style option */
  static isValidQuoteStyle(style) {
    return this.getQuoteStyleOptions().includes(style);
  }
  /** Validate a semicolon option */
  static isValidSemicolonOption(option) {
    return this.getSemicolonOptions().includes(option);
  }
  /** Validate a trailing comma option */
  static isValidTrailingCommaOption(option) {
    return this.getTrailingCommaOptions().includes(option);
  }
}
exports.ConfigTypes = ConfigTypes;
exports.FormatterOrder = FormatterOrder;

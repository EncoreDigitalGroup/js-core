"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
class BaseFormattingRule {
  constructor(container, config) {
    this.container = container;
    if (config) {
      this.config = config;
    } else {
      this.config = this.container.resolve("CoreConfig");
    }
  }
  /** Helper method to get the core configuration */
  getConfig() {
    return this.config;
  }
  /** Helper method to get code style configuration */
  getCodeStyleConfig() {
    return this.getConfig().codeStyle;
  }
  /** Helper method to get imports configuration */
  getImportsConfig() {
    return this.getConfig().imports;
  }
  /** Helper method to get index generation configuration */
  getIndexGenerationConfig() {
    return this.getConfig().indexGeneration;
  }
  /** Helper method to get sorting configuration */
  getSortingConfig() {
    return this.getConfig().sorting;
  }
  /** Helper method to get spacing configuration */
  getSpacingConfig() {
    return this.getConfig().spacing;
  }
}
exports.BaseFormattingRule = BaseFormattingRule;

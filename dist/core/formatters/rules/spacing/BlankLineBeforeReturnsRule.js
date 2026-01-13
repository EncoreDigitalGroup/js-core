"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class BlankLineBeforeReturnsRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "BlankLineBeforeReturnsRule";
  }
  apply(source, filePath) {
    const config = this.getSpacingConfig();
    if (!config?.beforeReturns) {
      return source;
    }
    const lines = source.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const trimmedCurrentLine = currentLine.trim();
      const previousLine = i > 0 ? lines[i - 1] : "";
      const trimmedPreviousLine = previousLine.trim();
      const isReturnStatement = trimmedCurrentLine.startsWith("return ");
      const previousIsComment = trimmedPreviousLine.startsWith("//") || trimmedPreviousLine.startsWith("/*") || trimmedPreviousLine.startsWith("*") || trimmedPreviousLine.endsWith("*/");
      const previousIsBlank = trimmedPreviousLine === "";
      if (isReturnStatement && !previousIsBlank && !previousIsComment && i > 0) {
        result.push("");
      }
      result.push(currentLine);
    }
    return result.join("\n");
  }
}
exports.BlankLineBeforeReturnsRule = BlankLineBeforeReturnsRule;

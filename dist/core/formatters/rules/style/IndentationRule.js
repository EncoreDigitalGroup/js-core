"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class IndentationRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "IndentationRule";
  }
  apply(source, filePath) {
    const config = this.getCodeStyleConfig();
    if (!config?.indentStyle || !config.indentWidth) {
      return source;
    }
    const indentWidth = config.indentWidth;
    const lines = source.split("\n");
    const result = [];
    for (const line of lines) {
      if (line.trim() === "") {
        result.push(line);
        continue;
      }
      const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
      const content = line.substring(leadingWhitespace.length);
      let indentLevel = 0;
      if (config.indentStyle === "space") {
        const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
        const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
        indentLevel = tabCount + Math.floor(spaceCount / indentWidth);
      } else {
        const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
        const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
        indentLevel = tabCount + Math.floor(spaceCount / indentWidth);
      }
      let newIndent;
      if (config.indentStyle === "space") {
        newIndent = " ".repeat(indentLevel * indentWidth);
      } else {
        newIndent = "	".repeat(indentLevel);
      }
      result.push(newIndent + content);
    }
    return result.join("\n");
  }
}
exports.IndentationRule = IndentationRule;

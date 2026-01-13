"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class BlockSpacingRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "BlockSpacingRule";
  }
  apply(source, filePath) {
    let result = source;
    result = result.replace(/\{\n\n+(\s*(?:\/\*\*|[a-zA-Z_]))/g, "{\n$1");
    result = result.replace(/(\*\/)\n\n+(\s+[a-zA-Z_])/g, "$1\n$2");
    result = result.replace(/\n\n+(\s*\})/g, "\n$1");
    return result;
  }
}
exports.BlockSpacingRule = BlockSpacingRule;

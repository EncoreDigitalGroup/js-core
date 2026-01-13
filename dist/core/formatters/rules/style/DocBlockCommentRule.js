"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class DocBlockCommentRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "DocBlockCommentRule";
  }
  apply(source, filePath) {
    const docBlockPattern = /\/\*\*\s*\n\s*\*\s*([^\n]*?)\s*\n\s*\*\//g;
    return source.replace(docBlockPattern, (match, content) => {
      if (content && content.trim()) {
        return `/** ${content.trim()} */`;
      }
      return match;
    });
  }
}
exports.DocBlockCommentRule = DocBlockCommentRule;

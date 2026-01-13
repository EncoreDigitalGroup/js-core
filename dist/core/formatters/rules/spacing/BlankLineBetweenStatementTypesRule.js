"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class BlankLineBetweenStatementTypesRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "BlankLineBetweenStatementTypesRule";
  }
  /** Determine the type of a statement */
  getStatementType(trimmedLine) {
    if (trimmedLine.startsWith("if ") || trimmedLine.startsWith("if(") || trimmedLine.startsWith("else ") || trimmedLine.startsWith("else{") || trimmedLine.startsWith("switch ") || trimmedLine.startsWith("switch(") || trimmedLine.startsWith("case ") || trimmedLine.startsWith("default:")) {
      return "control";
    }
    if (trimmedLine.startsWith("for ") || trimmedLine.startsWith("for(") || trimmedLine.startsWith("while ") || trimmedLine.startsWith("while(") || trimmedLine.startsWith("do ") || trimmedLine.startsWith("do{")) {
      return "loop";
    }
    if (trimmedLine.startsWith("try ") || trimmedLine.startsWith("try{") || trimmedLine.startsWith("catch ") || trimmedLine.startsWith("catch(") || trimmedLine.startsWith("finally ") || trimmedLine.startsWith("finally{") || trimmedLine.startsWith("throw ")) {
      return "exception";
    }
    if (trimmedLine.startsWith("const ") || trimmedLine.startsWith("let ") || trimmedLine.startsWith("var ") || trimmedLine.startsWith("function ") || trimmedLine.startsWith("class ") || trimmedLine.startsWith("interface ") || trimmedLine.startsWith("type ") || trimmedLine.startsWith("enum ") || trimmedLine.startsWith("export ")) {
      return "declaration";
    }
    return "expression";
  }
  apply(source, filePath) {
    const config = this.getSpacingConfig();
    if (!config?.betweenStatementTypes) {
      return source;
    }
    const lines = source.split("\n");
    const result = [];
    let lastStatementType = null;
    let inImportSection = true;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const isBlankLine = trimmedLine === "";
      const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*");
      const isImport = trimmedLine.startsWith("import ");
      if (inImportSection && !isImport && !isBlankLine && !isComment) {
        inImportSection = false;
      }
      if (inImportSection || isBlankLine || isComment) {
        result.push(line);
        continue;
      }
      const currentStatementType = this.getStatementType(trimmedLine);
      if (lastStatementType !== null && lastStatementType !== currentStatementType && result.length > 0 && result[result.length - 1].trim() !== "") {
        result.push("");
      }
      result.push(line);
      lastStatementType = currentStatementType;
    }
    return result.join("\n");
  }
}
exports.BlankLineBetweenStatementTypesRule = BlankLineBetweenStatementTypesRule;

"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class BlankLineBetweenDeclarationsRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "BlankLineBetweenDeclarationsRule";
  }
  /** Extracts the keyword from a declaration line */
  getDeclarationKeyword(trimmedLine) {
    if (trimmedLine.startsWith("export ")) {
      return "export";
    }
    if (trimmedLine.startsWith("function ")) {
      return "function";
    }
    if (trimmedLine.startsWith("const ")) {
      return "const";
    }
    if (trimmedLine.startsWith("let ")) {
      return "let";
    }
    if (trimmedLine.startsWith("var ")) {
      return "var";
    }
    if (trimmedLine.startsWith("enum ")) {
      return "enum";
    }
    if (trimmedLine.startsWith("interface ")) {
      return "interface";
    }
    if (trimmedLine.startsWith("type ")) {
      return "type";
    }
    if (trimmedLine.startsWith("class ")) {
      return "class";
    }
    return null;
  }
  apply(source, filePath) {
    const config = this.getSpacingConfig();
    if (!config?.betweenDeclarations) {
      return source;
    }
    const lines = source.split("\n");
    const result = [];
    let inImportSection = true;
    let lastNonBlankLineWasDeclarationEnd = false;
    let lastDeclarationKeyword = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      (line.match(/{/g) || []).length;
      (line.match(/}/g) || []).length;
      const isBlankLine = trimmedLine === "";
      const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*") || trimmedLine === "*/";
      const isBlockCommentStart = trimmedLine.startsWith("/*") && !trimmedLine.endsWith("*/");
      const isImport = trimmedLine.startsWith("import ");
      const declarationKeyword = !isComment && !isImport ? this.getDeclarationKeyword(trimmedLine) : null;
      const isDeclarationStart = declarationKeyword !== null;
      if (inImportSection && !isImport && !isBlankLine && !isComment) {
        inImportSection = false;
      }
      if (!inImportSection) {
        if (isBlockCommentStart && lastNonBlankLineWasDeclarationEnd && result.length > 0 && result[result.length - 1].trim() !== "") {
          result.push("");
          lastNonBlankLineWasDeclarationEnd = false;
        } else if (isDeclarationStart && lastNonBlankLineWasDeclarationEnd && result.length > 0 && result[result.length - 1].trim() !== "" && declarationKeyword !== lastDeclarationKeyword) {
          result.push("");
          lastNonBlankLineWasDeclarationEnd = false;
        }
      }
      result.push(line);
      const hasClosingElement = trimmedLine === "}" || trimmedLine.endsWith("}") || trimmedLine.endsWith(";");
      const isJustClosingBraces = /^[\s});]*$/.test(trimmedLine);
      if (!isBlankLine && hasClosingElement) {
        lastNonBlankLineWasDeclarationEnd = true;
        if (isDeclarationStart) {
          lastDeclarationKeyword = declarationKeyword;
        }
      } else if (!isBlankLine && !isComment) {
        if (!isBlockCommentStart && trimmedLine !== "" && !isJustClosingBraces) {
          lastNonBlankLineWasDeclarationEnd = isDeclarationStart;
          if (isDeclarationStart) {
            lastDeclarationKeyword = declarationKeyword;
          }
        }
      }
    }
    return result.join("\n");
  }
}
exports.BlankLineBetweenDeclarationsRule = BlankLineBetweenDeclarationsRule;

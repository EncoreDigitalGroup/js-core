"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ts = require("typescript");
const BaseFormattingRule = require("../../BaseFormattingRule.js");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const ts__namespace = /* @__PURE__ */ _interopNamespaceDefault(ts);
class BracketSpacingRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "BracketSpacingRule";
  }
  apply(source, filePath) {
    const config = this.getCodeStyleConfig();
    if (!config || config.bracketSpacing === void 0) {
      return source;
    }
    const sourceFile = ts__namespace.createSourceFile("temp.ts", source, ts__namespace.ScriptTarget.Latest, true, ts__namespace.ScriptKind.TS);
    const changes = [];
    const fullText = sourceFile.getFullText();
    const visit = (node) => {
      if (ts__namespace.isObjectLiteralExpression(node)) {
        const openBraceEnd = node.getStart(sourceFile) + 1;
        const closeBraceStart = node.getEnd() - 1;
        if (node.properties.length > 0) {
          if (config.bracketSpacing) {
            const afterOpenBrace = fullText[openBraceEnd];
            if (afterOpenBrace !== " " && afterOpenBrace !== "\n") {
              changes.push({ pos: openBraceEnd, type: "add", text: " " });
            }
            const beforeCloseBrace = fullText[closeBraceStart - 1];
            if (beforeCloseBrace !== " " && beforeCloseBrace !== "\n") {
              changes.push({ pos: closeBraceStart, type: "add", text: " " });
            }
          } else {
            let pos = openBraceEnd;
            while (fullText[pos] === " " || fullText[pos] === "	") {
              changes.push({ pos, type: "remove" });
              pos++;
            }
            pos = closeBraceStart - 1;
            while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "	")) {
              changes.push({ pos, type: "remove" });
              pos--;
            }
          }
        }
      }
      if (ts__namespace.isNamedImports(node)) {
        const parent = node.parent;
        if (parent && ts__namespace.isImportClause(parent)) {
          const openBraceEnd = node.getStart(sourceFile) + 1;
          const closeBraceStart = node.getEnd() - 1;
          if (node.elements.length > 0) {
            if (config.bracketSpacing) {
              const afterOpenBrace = fullText[openBraceEnd];
              if (afterOpenBrace !== " ") {
                changes.push({ pos: openBraceEnd, type: "add", text: " " });
              }
              const beforeCloseBrace = fullText[closeBraceStart - 1];
              if (beforeCloseBrace !== " ") {
                changes.push({ pos: closeBraceStart, type: "add", text: " " });
              }
            } else {
              let pos = openBraceEnd;
              while (fullText[pos] === " " || fullText[pos] === "	") {
                changes.push({ pos, type: "remove" });
                pos++;
              }
              pos = closeBraceStart - 1;
              while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "	")) {
                changes.push({ pos, type: "remove" });
                pos--;
              }
            }
          }
        }
      }
      ts__namespace.forEachChild(node, visit);
    };
    visit(sourceFile);
    changes.sort((a, b) => b.pos - a.pos);
    let result = source;
    for (const change of changes) {
      if (change.type === "add") {
        result = result.substring(0, change.pos) + (change.text || " ") + result.substring(change.pos);
      } else {
        result = result.substring(0, change.pos) + result.substring(change.pos + 1);
      }
    }
    return result;
  }
}
exports.BracketSpacingRule = BracketSpacingRule;

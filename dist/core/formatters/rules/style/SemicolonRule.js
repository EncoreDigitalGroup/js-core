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
class SemicolonRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "SemicolonRule";
  }
  apply(source, filePath) {
    const config = this.getCodeStyleConfig();
    if (!config?.semicolons) {
      return source;
    }
    const sourceFile = ts__namespace.createSourceFile("temp.ts", source, ts__namespace.ScriptTarget.Latest, true, ts__namespace.ScriptKind.TS);
    const changes = [];
    const visit = (node) => {
      if (ts__namespace.isVariableStatement(node) || ts__namespace.isExpressionStatement(node) || ts__namespace.isReturnStatement(node) || ts__namespace.isThrowStatement(node) || ts__namespace.isBreakStatement(node) || ts__namespace.isContinueStatement(node) || ts__namespace.isImportDeclaration(node) || ts__namespace.isExportDeclaration(node) || ts__namespace.isTypeAliasDeclaration(node)) {
        const nodeEnd = node.getEnd();
        const fullText = sourceFile.getFullText();
        const hasSemicolon = fullText[nodeEnd - 1] === ";";
        if (config.semicolons === "always" && !hasSemicolon) {
          changes.push({ pos: nodeEnd, type: "add" });
        } else if (config.semicolons === "never" && hasSemicolon) {
          changes.push({ pos: nodeEnd - 1, type: "remove" });
        }
      }
      if (ts__namespace.isInterfaceDeclaration(node) || ts__namespace.isClassDeclaration(node) || ts__namespace.isEnumDeclaration(node)) {
        const nodeEnd = node.getEnd();
        const fullText = sourceFile.getFullText();
        const hasSemicolon = fullText[nodeEnd] === ";";
        if (hasSemicolon) {
          changes.push({ pos: nodeEnd, type: "remove" });
        }
      }
      ts__namespace.forEachChild(node, visit);
    };
    visit(sourceFile);
    changes.sort((a, b) => b.pos - a.pos);
    let result = source;
    for (const change of changes) {
      if (change.type === "add") {
        result = result.substring(0, change.pos) + ";" + result.substring(change.pos);
      } else {
        result = result.substring(0, change.pos) + result.substring(change.pos + 1);
      }
    }
    return result;
  }
}
exports.SemicolonRule = SemicolonRule;

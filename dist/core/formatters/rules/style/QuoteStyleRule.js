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
class QuoteStyleRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "QuoteStyleRule";
  }
  apply(source, filePath) {
    const config = this.getCodeStyleConfig();
    if (!config?.quoteStyle) {
      return source;
    }
    const sourceFile = ts__namespace.createSourceFile("temp.ts", source, ts__namespace.ScriptTarget.Latest, true, ts__namespace.ScriptKind.TS);
    const changes = [];
    const visit = (node) => {
      if (ts__namespace.isStringLiteral(node)) {
        const nodeText = node.getText(sourceFile);
        const currentQuote = nodeText[0];
        const desiredQuote = config.quoteStyle === "single" ? "'" : '"';
        if (currentQuote !== desiredQuote) {
          const content = node.text;
          const needsEscape = content.includes(desiredQuote);
          if (!needsEscape) {
            const newText = desiredQuote + content + desiredQuote;
            changes.push({
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              text: newText
            });
          }
        }
      }
      ts__namespace.forEachChild(node, visit);
    };
    visit(sourceFile);
    changes.sort((a, b) => b.start - a.start);
    let result = source;
    for (const change of changes) {
      result = result.substring(0, change.start) + change.text + result.substring(change.end);
    }
    return result;
  }
}
exports.QuoteStyleRule = QuoteStyleRule;

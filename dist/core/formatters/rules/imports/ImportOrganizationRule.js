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
class ImportOrganizationRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "ImportOrganizationRule";
  }
  createSourceFile(source) {
    return ts__namespace.createSourceFile("temp.ts", source, ts__namespace.ScriptTarget.Latest, true, ts__namespace.ScriptKind.TS);
  }
  determineImportGroup(moduleSpecifier) {
    if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/")) {
      return "relative";
    }
    if (moduleSpecifier.startsWith("@/") || moduleSpecifier.startsWith("~/")) {
      return "internal";
    }
    return "external";
  }
  extractImports(sourceFile) {
    const imports = [];
    for (const statement of sourceFile.statements) {
      if (ts__namespace.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier.text;
        const isSideEffect = !statement.importClause;
        const isTypeOnly = statement.importClause?.isTypeOnly || false;
        const group = this.determineImportGroup(moduleSpecifier);
        imports.push({
          statement,
          moduleSpecifier,
          importClause: statement.importClause,
          isTypeOnly,
          isSideEffect,
          group
        });
      }
    }
    return imports;
  }
  getImportedIdentifiers(importInfo) {
    const identifiers = [];
    if (!importInfo.importClause) {
      return identifiers;
    }
    if (importInfo.importClause.name) {
      identifiers.push(importInfo.importClause.name.text);
    }
    if (importInfo.importClause.namedBindings) {
      if (ts__namespace.isNamedImports(importInfo.importClause.namedBindings)) {
        for (const element of importInfo.importClause.namedBindings.elements) {
          identifiers.push(element.name.text);
        }
      } else if (ts__namespace.isNamespaceImport(importInfo.importClause.namedBindings)) {
        identifiers.push(importInfo.importClause.namedBindings.name.text);
      }
    }
    return identifiers;
  }
  isIdentifierUsed(identifier, sourceFile) {
    let found = false;
    const visit = (node) => {
      if (found)
        return;
      if (ts__namespace.isIdentifier(node) && node.text === identifier) {
        const parent = node.parent;
        if (!ts__namespace.isImportSpecifier(parent) && !ts__namespace.isImportClause(parent)) {
          found = true;
        }
      }
      ts__namespace.forEachChild(node, visit);
    };
    visit(sourceFile);
    return found;
  }
  isImportUsed(importInfo, sourceFile) {
    if (importInfo.isSideEffect) {
      return true;
    }
    if (!importInfo.importClause) {
      return true;
    }
    const identifiers = this.getImportedIdentifiers(importInfo);
    return identifiers.some((id) => this.isIdentifierUsed(id, sourceFile));
  }
  filterUnusedImports(imports, sourceFile) {
    const config = this.getImportsConfig();
    if (!config?.removeUnused) {
      return imports;
    }
    if (!config.removeSideEffects) {
      return imports.filter((imp) => imp.isSideEffect || this.isImportUsed(imp, sourceFile));
    }
    return imports.filter((imp) => this.isImportUsed(imp, sourceFile));
  }
  sortImports(imports) {
    const config = this.getImportsConfig();
    if (!config?.sortImports) {
      return imports;
    }
    return [...imports].sort((a, b) => {
      return a.moduleSpecifier.localeCompare(b.moduleSpecifier);
    });
  }
  groupImports(imports) {
    const config = this.getImportsConfig();
    if (!config?.groupImports) {
      return imports;
    }
    const groupOrder = config.groupOrder || ["external", "internal", "relative"];
    const grouped = [];
    for (const group of groupOrder) {
      const groupImports = imports.filter((imp) => imp.group === group);
      grouped.push(...groupImports);
    }
    return grouped;
  }
  reconstructSource(sourceFile, imports) {
    const config = this.getImportsConfig();
    const fullText = sourceFile.getFullText();
    const leadingCommentsMatch = fullText.match(/^((?:\/\*[\s\S]*?\*\/\s*)+)/);
    let leadingComments = leadingCommentsMatch ? leadingCommentsMatch[1].trim() : "";
    if (leadingComments) {
      const commentBlocks = leadingComments.match(/\/\*[\s\S]*?\*\//g) || [];
      const uniqueBlocks = new Set(commentBlocks.map((block) => block.trim()));
      leadingComments = Array.from(uniqueBlocks).join("\n");
    }
    const importStatements = sourceFile.statements.filter((stmt) => ts__namespace.isImportDeclaration(stmt));
    const lastImport = importStatements[importStatements.length - 1];
    const afterImportsPos = lastImport ? lastImport.getEnd() : leadingCommentsMatch ? leadingCommentsMatch[0].length : 0;
    let restOfFile = fullText.substring(afterImportsPos);
    if (restOfFile && !restOfFile.startsWith("\n")) {
      restOfFile = "\n" + restOfFile;
    }
    restOfFile = restOfFile.replace(/^\n{2,}/, "\n");
    const printer = ts__namespace.createPrinter({
      newLine: ts__namespace.NewLineKind.LineFeed,
      removeComments: false
    });
    const importLines = [];
    let lastGroup = null;
    for (const importInfo of imports) {
      if (config?.separateGroups && lastGroup !== null && lastGroup !== importInfo.group) {
        importLines.push("");
      }
      let importText = printer.printNode(ts__namespace.EmitHint.Unspecified, importInfo.statement, sourceFile);
      importText = importText.replace(/^((?:\/\*[\s\S]*?\*\/\s*)+)/, "").trim();
      importLines.push(importText);
      lastGroup = importInfo.group;
    }
    const sections = [];
    if (leadingComments) {
      sections.push(leadingComments);
    }
    if (importLines.length > 0) {
      sections.push(importLines.join("\n"));
    }
    if (restOfFile) {
      sections.push(restOfFile);
    }
    let combined = sections.join("\n\n");
    combined = combined.replace(/(;\n+)+;?\s*$/, "\n");
    return combined;
  }
  apply(source, filePath) {
    const config = this.getImportsConfig();
    if (!config?.enabled) {
      return source;
    }
    const sourceFile = this.createSourceFile(source);
    const imports = this.extractImports(sourceFile);
    let processedImports = this.filterUnusedImports(imports, sourceFile);
    processedImports = this.sortImports(processedImports);
    processedImports = this.groupImports(processedImports);
    return this.reconstructSource(sourceFile, processedImports);
  }
}
exports.ImportOrganizationRule = ImportOrganizationRule;

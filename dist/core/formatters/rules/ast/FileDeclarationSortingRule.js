"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ts = require("typescript");
const ASTAnalyzer = require("../../../ast/ASTAnalyzer.js");
const DependencyResolver = require("../../../ast/DependencyResolver.js");
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
var DeclarationType = /* @__PURE__ */ ((DeclarationType2) => {
  DeclarationType2["Interface"] = "interface";
  DeclarationType2["TypeAlias"] = "type_alias";
  DeclarationType2["Enum"] = "enum";
  DeclarationType2["HelperFunction"] = "helper_function";
  DeclarationType2["HelperVariable"] = "helper_variable";
  DeclarationType2["ExportedFunction"] = "exported_function";
  DeclarationType2["ExportedVariable"] = "exported_variable";
  DeclarationType2["ExportedClass"] = "exported_class";
  DeclarationType2["DefaultExport"] = "default_export";
  DeclarationType2["Other"] = "other";
  return DeclarationType2;
})(DeclarationType || {});
const DEFAULT_FILE_ORDER = [
  "interface",
  "type_alias",
  "enum",
  "helper_function",
  "helper_variable",
  "exported_function",
  "exported_variable",
  "exported_class",
  "default_export",
  "other"
  /* Other */
];
class FileDeclarationSortingRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "FileDeclarationSortingRule";
  }
  /** Determine the type of a top-level declaration */
  getDeclarationType(node) {
    const exported = ASTAnalyzer.ASTAnalyzer.isExported(node);
    const defaultExp = ASTAnalyzer.ASTAnalyzer.isDefaultExport(node);
    if (defaultExp) {
      return "default_export";
    }
    if (ts__namespace.isInterfaceDeclaration(node)) {
      return "interface";
    }
    if (ts__namespace.isTypeAliasDeclaration(node)) {
      return "type_alias";
    }
    if (ts__namespace.isEnumDeclaration(node)) {
      return "enum";
    }
    if (ts__namespace.isFunctionDeclaration(node)) {
      return exported ? "exported_function" : "helper_function";
    }
    if (ts__namespace.isVariableStatement(node)) {
      return exported ? "exported_variable" : "helper_variable";
    }
    if (ts__namespace.isClassDeclaration(node)) {
      return exported ? "exported_class" : "other";
    }
    if (ts__namespace.isExportAssignment(node)) {
      return "default_export";
    }
    return "other";
  }
  /** Analyze a top-level statement */
  analyzeDeclaration(node, sourceFile, index, allDeclarationNames) {
    const type = this.getDeclarationType(node);
    const name = ASTAnalyzer.ASTAnalyzer.getDeclarationName(node);
    const isExported = ASTAnalyzer.ASTAnalyzer.isExported(node);
    const isDefaultExport = ASTAnalyzer.ASTAnalyzer.isDefaultExport(node);
    const text = node.getFullText(sourceFile);
    const allDependencies = ASTAnalyzer.ASTAnalyzer.extractFileDeclarationReferences(node, allDeclarationNames);
    const dependencies = new Set(Array.from(allDependencies).filter((dep) => dep !== name));
    return {
      node,
      type,
      name,
      isExported,
      isDefaultExport,
      text,
      dependencies,
      originalIndex: index
    };
  }
  createSourceFile(source, filePath) {
    return ts__namespace.createSourceFile(filePath, source, ts__namespace.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts__namespace.ScriptKind.TSX : ts__namespace.ScriptKind.TS);
  }
  /** Sort file declarations according to configuration */
  sortFileDeclarations(declarations) {
    const config = this.getSortingConfig()?.fileDeclarations;
    const order = config?.order || DEFAULT_FILE_ORDER;
    return [...declarations].sort((a, b) => {
      const aTypeIndex = order.indexOf(a.type);
      const bTypeIndex = order.indexOf(b.type);
      if (aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex;
      }
      return a.name.localeCompare(b.name);
    });
  }
  apply(source, filePath) {
    const config = this.getSortingConfig()?.fileDeclarations;
    if (!config?.enabled) {
      return source;
    }
    const sourceFile = this.createSourceFile(source, filePath || "temp.ts");
    const otherStatements = [];
    sourceFile.statements.forEach((statement) => {
      if (ts__namespace.isImportDeclaration(statement) || ts__namespace.isImportEqualsDeclaration(statement)) ;
      else if (!ts__namespace.isEmptyStatement(statement)) {
        otherStatements.push(statement);
      }
    });
    if (otherStatements.length === 0) {
      return source;
    }
    const allDeclarationNames = new Set(otherStatements.map((stmt) => ASTAnalyzer.ASTAnalyzer.getDeclarationName(stmt)).filter((n) => n));
    const analyzedDeclarations = otherStatements.map(
      (stmt, index) => this.analyzeDeclaration(stmt, sourceFile, index, allDeclarationNames)
    );
    let sortedDeclarations = this.sortFileDeclarations(analyzedDeclarations);
    if (config.respectDependencies !== false) {
      sortedDeclarations = DependencyResolver.DependencyResolver.reorderWithDependencies(sortedDeclarations, (d) => d.name);
    }
    const orderChanged = sortedDeclarations.some((decl, index) => decl.originalIndex !== index);
    if (!orderChanged) {
      return source;
    }
    const firstDeclaration = otherStatements[0];
    const lastDeclaration = otherStatements[otherStatements.length - 1];
    const declarationsStart = firstDeclaration.getFullStart();
    const declarationsEnd = lastDeclaration.getEnd();
    const declarationTexts = sortedDeclarations.map((d) => d.text.trim());
    const newDeclarations = declarationTexts.join("\n\n");
    let formatted = source.substring(0, declarationsStart) + "\n\n" + newDeclarations + source.substring(declarationsEnd);
    formatted = formatted.replace(/(\n;)+\s*$/, "\n");
    return formatted;
  }
}
exports.DEFAULT_FILE_ORDER = DEFAULT_FILE_ORDER;
exports.DeclarationType = DeclarationType;
exports.FileDeclarationSortingRule = FileDeclarationSortingRule;

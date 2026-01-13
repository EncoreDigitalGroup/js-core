"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ts = require("typescript");
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
class ASTAnalyzer {
  /**
  * Extracts all identifier references from a node
  * This is the core traversal function that recursively visits the AST
  */
  static extractReferences(node, scopeFilter) {
    const identifiers = /* @__PURE__ */ new Set();
    const thisReferences = /* @__PURE__ */ new Set();
    const directCalls = /* @__PURE__ */ new Set();
    function visit(currentNode) {
      if (ts__namespace.isPropertyAccessExpression(currentNode)) {
        if (currentNode.expression.kind === ts__namespace.SyntaxKind.ThisKeyword) {
          const propName = currentNode.name.text;
          if (!scopeFilter || scopeFilter(propName)) {
            thisReferences.add(propName);
            identifiers.add(propName);
          }
        }
      }
      if (ts__namespace.isIdentifier(currentNode)) {
        const name = currentNode.text;
        if (!scopeFilter || scopeFilter(name)) {
          identifiers.add(name);
          const parent = currentNode.parent;
          if (parent && ts__namespace.isCallExpression(parent) && parent.expression === currentNode) {
            directCalls.add(name);
          }
        }
      }
      if (ts__namespace.isElementAccessExpression(currentNode)) {
        if (currentNode.expression.kind === ts__namespace.SyntaxKind.ThisKeyword) {
          if (ts__namespace.isStringLiteral(currentNode.argumentExpression)) {
            const propName = currentNode.argumentExpression.text;
            if (!scopeFilter || scopeFilter(propName)) {
              thisReferences.add(propName);
              identifiers.add(propName);
            }
          }
        }
      }
      ts__namespace.forEachChild(currentNode, visit);
    }
    visit(node);
    return { identifiers, thisReferences, directCalls };
  }
  /**
  * Extract references from a class member
  * Only considers references to members in availableMembers set
  */
  static extractClassMemberReferences(member, availableMembers) {
    if (ts__namespace.isConstructorDeclaration(member)) {
      return /* @__PURE__ */ new Set();
    }
    const refs = this.extractReferences(member, (name) => availableMembers.has(name));
    return /* @__PURE__ */ new Set([...refs.thisReferences, ...refs.identifiers]);
  }
  /**
  * Extract references from a file-level declaration
  * Only considers references to declarations in availableDeclarations set
  */
  static extractFileDeclarationReferences(declaration, availableDeclarations) {
    if (ts__namespace.isImportDeclaration(declaration) || ts__namespace.isImportEqualsDeclaration(declaration) || ts__namespace.isExportDeclaration(declaration)) {
      return /* @__PURE__ */ new Set();
    }
    const refs = this.extractReferences(declaration, (name) => availableDeclarations.has(name));
    return refs.identifiers;
  }
  /** Get the name of a class member */
  static getClassMemberName(member) {
    if (ts__namespace.isConstructorDeclaration(member)) {
      return "constructor";
    }
    if (ts__namespace.isPropertyDeclaration(member) || ts__namespace.isMethodDeclaration(member) || ts__namespace.isGetAccessorDeclaration(member) || ts__namespace.isSetAccessorDeclaration(member)) {
      if (ts__namespace.isIdentifier(member.name)) {
        return member.name.text;
      }
      if (ts__namespace.isStringLiteral(member.name)) {
        return member.name.text;
      }
    }
    return "";
  }
  /** Get the name of a file-level declaration */
  static getDeclarationName(declaration) {
    if (ts__namespace.isInterfaceDeclaration(declaration) || ts__namespace.isTypeAliasDeclaration(declaration) || ts__namespace.isEnumDeclaration(declaration) || ts__namespace.isFunctionDeclaration(declaration) || ts__namespace.isClassDeclaration(declaration)) {
      return declaration.name?.text || "";
    }
    if (ts__namespace.isVariableStatement(declaration)) {
      const firstDecl = declaration.declarationList.declarations[0];
      if (ts__namespace.isIdentifier(firstDecl.name)) {
        return firstDecl.name.text;
      }
    }
    return "";
  }
  /** Check if a node has a specific modifier */
  static hasModifier(node, kind) {
    const modifiers = ts__namespace.canHaveModifiers(node) ? ts__namespace.getModifiers(node) : void 0;
    return modifiers?.some((m) => m.kind === kind) || false;
  }
  /** Check if a statement is a default export */
  static isDefaultExport(node) {
    if (ts__namespace.isExportAssignment(node)) {
      return true;
    }
    return this.hasModifier(node, ts__namespace.SyntaxKind.DefaultKeyword);
  }
  /** Check if a statement has an export modifier */
  static isExported(node) {
    if (ts__namespace.isExportAssignment(node)) {
      return true;
    }
    return this.hasModifier(node, ts__namespace.SyntaxKind.ExportKeyword);
  }
}
exports.ASTAnalyzer = ASTAnalyzer;

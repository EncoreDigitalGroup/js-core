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
class ASTTransformer {
  /** Create a source file from source code */
  static createSourceFile(source, filePath) {
    const scriptKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts__namespace.ScriptKind.TSX : ts__namespace.ScriptKind.TS;
    return ts__namespace.createSourceFile(filePath, source, ts__namespace.ScriptTarget.Latest, true, scriptKind);
  }
  /** Print a node to string using TypeScript printer */
  static printNode(node, sourceFile, removeComments = false) {
    const printer = ts__namespace.createPrinter({
      newLine: ts__namespace.NewLineKind.LineFeed,
      removeComments
    });
    return printer.printNode(ts__namespace.EmitHint.Unspecified, node, sourceFile);
  }
  /**
  * Print a source file to string
  * Extracts and deduplicates leading comments to prevent duplication during formatting
  */
  static printSourceFile(sourceFile) {
    const fullText = sourceFile.getFullText();
    const leadingCommentsMatch = fullText.match(/^((?:\/\*[\s\S]*?\*\/\s*)+)/);
    let leadingComments = leadingCommentsMatch ? leadingCommentsMatch[1].trim() : "";
    if (leadingComments) {
      const commentBlocks = leadingComments.match(/\/\*[\s\S]*?\*\//g) || [];
      const uniqueBlocks = new Set(commentBlocks.map((block) => block.trim()));
      leadingComments = Array.from(uniqueBlocks).join("\n");
    }
    const printer = ts__namespace.createPrinter({
      newLine: ts__namespace.NewLineKind.LineFeed,
      removeComments: false
    });
    let printed = printer.printFile(sourceFile);
    printed = printed.replace(/(\n;)+\s*$/, "\n");
    if (leadingComments) {
      const printedWithoutLeadingComments = printed.replace(/^((?:\/\*[\s\S]*?\*\/\s*)+)/, "").trimStart();
      return leadingComments + "\n\n" + printedWithoutLeadingComments;
    }
    return printed;
  }
  /** Create a new class declaration with reordered members */
  static reorderClassMembers(classNode, orderedMembers) {
    return ts__namespace.factory.updateClassDeclaration(classNode, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, orderedMembers);
  }
  /** Create a new source file with reordered statements */
  static reorderSourceFileStatements(sourceFile, orderedStatements) {
    return ts__namespace.factory.updateSourceFile(sourceFile, orderedStatements, sourceFile.isDeclarationFile, sourceFile.referencedFiles, sourceFile.typeReferenceDirectives, sourceFile.hasNoDefaultLib, sourceFile.libReferenceDirectives);
  }
  /** Transform a source file by visiting all nodes */
  static transformSourceFile(sourceFile, visitor) {
    const transformer = (context) => {
      const visit = (node) => {
        const result2 = visitor(node);
        if (result2)
          return result2;
        return ts__namespace.visitEachChild(node, visit, context);
      };
      return (node) => ts__namespace.visitNode(node, visit);
    };
    const result = ts__namespace.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    result.dispose();
    return transformedSourceFile;
  }
}
exports.ASTTransformer = ASTTransformer;

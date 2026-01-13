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
var MemberType = /* @__PURE__ */ ((MemberType2) => {
  MemberType2["StaticProperty"] = "static_property";
  MemberType2["InstanceProperty"] = "instance_property";
  MemberType2["Constructor"] = "constructor";
  MemberType2["StaticMethod"] = "static_method";
  MemberType2["InstanceMethod"] = "instance_method";
  MemberType2["GetAccessor"] = "get_accessor";
  MemberType2["SetAccessor"] = "set_accessor";
  return MemberType2;
})(MemberType || {});
const DEFAULT_CLASS_ORDER = [
  "static_property",
  "instance_property",
  "constructor",
  "get_accessor",
  "set_accessor",
  "static_method",
  "instance_method"
  /* InstanceMethod */
];
class ClassMemberSortingRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "ClassMemberSortingRule";
  }
  /** Determine the type of a class member */
  getMemberType(member) {
    if (ts__namespace.isConstructorDeclaration(member)) {
      return "constructor";
    }
    const isStatic = ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.StaticKeyword);
    if (ts__namespace.isPropertyDeclaration(member)) {
      return isStatic ? "static_property" : "instance_property";
    }
    if (ts__namespace.isGetAccessorDeclaration(member)) {
      return "get_accessor";
    }
    if (ts__namespace.isSetAccessorDeclaration(member)) {
      return "set_accessor";
    }
    if (ts__namespace.isMethodDeclaration(member)) {
      return isStatic ? "static_method" : "instance_method";
    }
    return "instance_method";
  }
  /** Analyze a class member to extract metadata */
  analyzeClassMember(member, sourceFile, index, allMemberNames) {
    const type = this.getMemberType(member);
    const name = ASTAnalyzer.ASTAnalyzer.getClassMemberName(member);
    const isStatic = ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.StaticKeyword);
    const isPublic = ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.PublicKeyword) || !ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.PrivateKeyword) && !ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.ProtectedKeyword);
    const isProtected = ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.ProtectedKeyword);
    const isPrivate = ASTAnalyzer.ASTAnalyzer.hasModifier(member, ts__namespace.SyntaxKind.PrivateKeyword);
    const decorators = ts__namespace.canHaveDecorators(member) ? ts__namespace.getDecorators(member) : void 0;
    const hasDecorator = decorators ? decorators.length > 0 : false;
    const text = member.getFullText(sourceFile);
    const allDependencies = ASTAnalyzer.ASTAnalyzer.extractClassMemberReferences(member, allMemberNames);
    const dependencies = new Set(Array.from(allDependencies).filter((dep) => dep !== name));
    return {
      node: member,
      type,
      name,
      isPublic,
      isProtected,
      isPrivate,
      isStatic,
      hasDecorator,
      text,
      dependencies,
      originalIndex: index
    };
  }
  createSourceFile(source, filePath) {
    return ts__namespace.createSourceFile(filePath, source, ts__namespace.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts__namespace.ScriptKind.TSX : ts__namespace.ScriptKind.TS);
  }
  /** Compare two class members for sorting */
  compareMembers(a, b, aTypeIndex, bTypeIndex) {
    if (aTypeIndex !== bTypeIndex) {
      return aTypeIndex - bTypeIndex;
    }
    const config = this.getSortingConfig()?.classMembers;
    if (config?.groupByVisibility) {
      if (a.isPublic !== b.isPublic)
        return a.isPublic ? -1 : 1;
      if (a.isProtected !== b.isProtected)
        return a.isProtected ? -1 : 1;
      if (a.isPrivate !== b.isPrivate)
        return a.isPrivate ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  }
  /** Sort class members according to configuration */
  sortClassMembers(members) {
    const config = this.getSortingConfig()?.classMembers;
    const order = config?.order || DEFAULT_CLASS_ORDER;
    return [...members].sort((a, b) => {
      const aTypeIndex = order.indexOf(a.type);
      const bTypeIndex = order.indexOf(b.type);
      return this.compareMembers(a, b, aTypeIndex, bTypeIndex);
    });
  }
  apply(source, filePath) {
    const config = this.getSortingConfig()?.classMembers;
    if (!config?.enabled) {
      return source;
    }
    const sourceFile = this.createSourceFile(source, filePath || "temp.ts");
    let formatted = source;
    const classes = [];
    const visit = (node) => {
      if (ts__namespace.isClassDeclaration(node)) {
        classes.push(node);
      }
      ts__namespace.forEachChild(node, visit);
    };
    visit(sourceFile);
    for (let i = classes.length - 1; i >= 0; i--) {
      const classNode = classes[i];
      if (!classNode.members || classNode.members.length === 0) {
        continue;
      }
      const allMemberNames = new Set(classNode.members.map((m) => ASTAnalyzer.ASTAnalyzer.getClassMemberName(m)).filter((n) => n && n !== "constructor"));
      const analyzedMembers = classNode.members.map(
        (member, index) => this.analyzeClassMember(member, sourceFile, index, allMemberNames)
      );
      let sortedMembers = this.sortClassMembers(analyzedMembers);
      if (config.respectDependencies !== false) {
        sortedMembers = DependencyResolver.DependencyResolver.reorderWithDependencies(sortedMembers, (m) => m.name);
      }
      const orderChanged = sortedMembers.some((member, index) => member.originalIndex !== index);
      if (!orderChanged) {
        continue;
      }
      const firstMember = classNode.members[0];
      const lastMember = classNode.members[classNode.members.length - 1];
      const classBodyStart = firstMember.getFullStart();
      const classBodyEnd = lastMember.getEnd();
      const memberTexts = sortedMembers.map((m) => m.text.trim());
      const newClassBody = memberTexts.join("\n\n");
      formatted = formatted.substring(0, classBodyStart) + "\n" + newClassBody + formatted.substring(classBodyEnd);
    }
    formatted = formatted.replace(/(\n;)+\s*$/, "\n");
    return formatted;
  }
}
exports.ClassMemberSortingRule = ClassMemberSortingRule;
exports.DEFAULT_CLASS_ORDER = DEFAULT_CLASS_ORDER;
exports.MemberType = MemberType;

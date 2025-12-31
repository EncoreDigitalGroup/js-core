"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortClassMembers = sortClassMembers;
exports.transformClass = transformClass;
const classMemberTypes_1 = require("../shared/classMemberTypes");
const classMemberUtils_1 = require("../shared/classMemberUtils");
const ts = __importStar(require("typescript"));
function analyzeClassMember(member, sourceFile) {
    const type = getMemberType(member);
    const name = (0, classMemberUtils_1.getMemberName)(member);
    const isStatic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.StaticKeyword);
    const isPublic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PublicKeyword) ||
        (!(0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PrivateKeyword) && !(0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.ProtectedKeyword));
    const isProtected = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.ProtectedKeyword);
    const isPrivate = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PrivateKeyword);
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) : undefined;
    const hasDecorator = decorators ? decorators.length > 0 : false;
    const text = member.getFullText(sourceFile);
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
    };
}
function getMemberType(member) {
    if (ts.isConstructorDeclaration(member)) {
        return classMemberTypes_1.MemberType.Constructor;
    }
    const isStatic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.StaticKeyword);
    if (ts.isPropertyDeclaration(member)) {
        return isStatic ? classMemberTypes_1.MemberType.StaticProperty : classMemberTypes_1.MemberType.InstanceProperty;
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return classMemberTypes_1.MemberType.GetAccessor;
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return classMemberTypes_1.MemberType.SetAccessor;
    }
    if (ts.isMethodDeclaration(member)) {
        return isStatic ? classMemberTypes_1.MemberType.StaticMethod : classMemberTypes_1.MemberType.InstanceMethod;
    }
    return classMemberTypes_1.MemberType.InstanceMethod;
}
function sortClassMembers(members, config = {}) {
    const order = config.order || classMemberTypes_1.DEFAULT_CLASS_ORDER;
    return [...members].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);
        return (0, classMemberTypes_1.compareMembers)(a, b, aTypeIndex, bTypeIndex, config);
    });
}
function transformClass(classNode, sourceFile, config) {
    if (!classNode.members || classNode.members.length === 0) {
        return classNode;
    }
    const analyzedMembers = classNode.members.map(member => analyzeClassMember(member, sourceFile));
    const sortedMembers = sortClassMembers(analyzedMembers, config);
    return ts.factory.updateClassDeclaration(classNode, ts.getModifiers(classNode), classNode.name, classNode.typeParameters, classNode.heritageClauses, sortedMembers.map(m => m.node));
}

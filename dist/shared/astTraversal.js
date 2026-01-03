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
exports.__extractReferences = __extractReferences;
exports.__extractClassMemberReferences = __extractClassMemberReferences;
exports.__extractFileDeclarationReferences = __extractFileDeclarationReferences;
const ts = __importStar(require("typescript"));
function __extractReferences(node, scopeFilter) {
    const identifiers = new Set();
    const thisReferences = new Set();
    const directCalls = new Set();
    function visit(currentNode) {
        if (ts.isPropertyAccessExpression(currentNode)) {
            if (currentNode.expression.kind === ts.SyntaxKind.ThisKeyword) {
                const propName = currentNode.name.text;
                if (!scopeFilter || scopeFilter(propName)) {
                    thisReferences.add(propName);
                    identifiers.add(propName);
                }
            }
        }
        if (ts.isIdentifier(currentNode)) {
            const name = currentNode.text;
            if (!scopeFilter || scopeFilter(name)) {
                identifiers.add(name);
                const parent = currentNode.parent;
                if (parent && ts.isCallExpression(parent) && parent.expression === currentNode) {
                    directCalls.add(name);
                }
            }
        }
        if (ts.isElementAccessExpression(currentNode)) {
            if (currentNode.expression.kind === ts.SyntaxKind.ThisKeyword) {
                if (ts.isStringLiteral(currentNode.argumentExpression)) {
                    const propName = currentNode.argumentExpression.text;
                    if (!scopeFilter || scopeFilter(propName)) {
                        thisReferences.add(propName);
                        identifiers.add(propName);
                    }
                }
            }
        }
        ts.forEachChild(currentNode, visit);
    }
    visit(node);
    return { identifiers, thisReferences, directCalls };
}
function __extractClassMemberReferences(member, availableMembers) {
    if (ts.isConstructorDeclaration(member)) {
        return new Set();
    }
    const refs = __extractReferences(member, name => availableMembers.has(name));
    return new Set([...refs.thisReferences, ...refs.identifiers]);
}
function __extractFileDeclarationReferences(declaration, availableDeclarations) {
    if (ts.isImportDeclaration(declaration) ||
        ts.isImportEqualsDeclaration(declaration) ||
        ts.isExportDeclaration(declaration)) {
        return new Set();
    }
    const refs = __extractReferences(declaration, name => availableDeclarations.has(name));
    return refs.identifiers;
}

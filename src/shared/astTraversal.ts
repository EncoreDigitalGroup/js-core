/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";

export interface ReferenceInfo {
    identifiers: Set<string>;
    thisReferences: Set<string>;
    directCalls: Set<string>;
}

/**
 * Extracts all identifier references from a node
 * This is the core traversal function that recursively visits the AST
 */
export function __extractReferences(node: ts.Node, scopeFilter?: (name: string) => boolean): ReferenceInfo {
    const identifiers = new Set<string>();
    const thisReferences = new Set<string>();
    const directCalls = new Set<string>();
    function visit(currentNode: ts.Node) {
        // Handle property access: this.memberName
        if (ts.isPropertyAccessExpression(currentNode)) {
            if (currentNode.expression.kind === ts.SyntaxKind.ThisKeyword) {
                const propName = currentNode.name.text;
                if (!scopeFilter || scopeFilter(propName)) {
                    thisReferences.add(propName);
                    identifiers.add(propName);
                }
            }
        }
        // Handle direct identifier references
        if (ts.isIdentifier(currentNode)) {
            const name = currentNode.text;
            if (!scopeFilter || scopeFilter(name)) {
                identifiers.add(name);
                // Check if it's a call expression
                const parent = currentNode.parent;
                if (parent && ts.isCallExpression(parent) && parent.expression === currentNode) {
                    directCalls.add(name);
                }
            }
        }
        // Handle element access: this['memberName']
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

    return {identifiers, thisReferences, directCalls};
}

/**
 * Extract references from a class member
 * Only considers references to members in availableMembers set
 */
export function __extractClassMemberReferences(member: ts.ClassElement, availableMembers: Set<string>): Set<string> {
    // Don't analyze constructor - it can reference anything
    if (ts.isConstructorDeclaration(member)) {
        return new Set();
    }
    const refs = __extractReferences(member, name => availableMembers.has(name));
    // For class members, we primarily care about this.x references
    // But also include direct identifiers that match member names
    return new Set([...refs.thisReferences, ...refs.identifiers]);
}

/**
 * Extract references from a file-level declaration
 * Only considers references to declarations in availableDeclarations set
 */
export function __extractFileDeclarationReferences(
    declaration: ts.Statement,
    availableDeclarations: Set<string>,
): Set<string> {
    // Skip import/export statements
    if (
        ts.isImportDeclaration(declaration) ||
        ts.isImportEqualsDeclaration(declaration) ||
        ts.isExportDeclaration(declaration)
    ) {
        return new Set();
    }
    const refs = __extractReferences(declaration, name => availableDeclarations.has(name));
    // For file declarations, we care about all identifiers
    // Exclude 'this' references as they don't apply at file level
    return refs.identifiers;
}

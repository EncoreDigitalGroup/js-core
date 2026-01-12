/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";


/**
* Information about references found in AST nodes
*/


/**
* Information about references found in AST nodes
*/


/**
* Information about references found in AST nodes
*/

/**
* Information about references found in AST nodes
*/

export interface ReferenceInfo {

    identifiers: Set<string>;
    thisReferences: Set<string>;
    directCalls: Set<string>;
}

/**
* Analyzes TypeScript AST nodes to extract references and dependencies
*/

export class ASTAnalyzer {

    /**
    * Extracts all identifier references from a node
    * This is the core traversal function that recursively visits the AST
    */

    static extractReferences(node: ts.Node, scopeFilter?: (name: string) => boolean): ReferenceInfo {

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
    static extractClassMemberReferences(member: ts.ClassElement, availableMembers: Set<string>): Set<string> {
        // Don't analyze constructor - it can reference anything

        if (ts.isConstructorDeclaration(member)) {

            return new Set();
        }

        const refs = this.extractReferences(member, name => availableMembers.has(name));
        // For class members, we primarily care about this.x references
        // But also include direct identifiers that match member names

        return new Set([...refs.thisReferences, ...refs.identifiers]);
    }

    /**
    * Extract references from a file-level declaration
    * Only considers references to declarations in availableDeclarations set
    */
    static extractFileDeclarationReferences(declaration: ts.Statement, availableDeclarations: Set<string>): Set<string> {
        // Skip import/export statements

        if (ts.isImportDeclaration(declaration) ||

            ts.isImportEqualsDeclaration(declaration) ||
            ts.isExportDeclaration(declaration)) {

            return new Set();
        }

        const refs = this.extractReferences(declaration, name => availableDeclarations.has(name));
        // For file declarations, we care about all identifiers
        // Exclude 'this' references as they don't apply at file level

        return refs.identifiers;
    }

    /**
    * Get the name of a class member
    */
    static getClassMemberName(member: ts.ClassElement): string {

        if (ts.isConstructorDeclaration(member)) {

            return "constructor";
        }

        if (ts.isPropertyDeclaration(member) ||

            ts.isMethodDeclaration(member) ||
            ts.isGetAccessorDeclaration(member) ||
            ts.isSetAccessorDeclaration(member)) {

            if (ts.isIdentifier(member.name)) {

                return member.name.text;
            }

            if (ts.isStringLiteral(member.name)) {

                return member.name.text;
            }
        }

        return "";
    }

    /**
    * Get the name of a file-level declaration
    */
    static getDeclarationName(declaration: ts.Statement): string {

        if (ts.isInterfaceDeclaration(declaration) ||

            ts.isTypeAliasDeclaration(declaration) ||
            ts.isEnumDeclaration(declaration) ||
            ts.isFunctionDeclaration(declaration) ||
            ts.isClassDeclaration(declaration)) {

            return declaration.name?.text || "";
        }

        if (ts.isVariableStatement(declaration)) {

            const firstDecl = declaration.declarationList.declarations[0];

            if (ts.isIdentifier(firstDecl.name)) {

                return firstDecl.name.text;
            }
        }

        return "";
    }

    /**
    * Check if a node has a specific modifier
    */
    static hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {

        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;

        return modifiers?.some(m => m.kind === kind) || false;
    }

    /**
    * Check if a statement is a default export
    */
    static isDefaultExport(node: ts.Statement): boolean {

        if (ts.isExportAssignment(node)) {

            return true;
        }

        return this.hasModifier(node, ts.SyntaxKind.DefaultKeyword);
    }

    /**
    * Check if a statement has an export modifier
    */
    static isExported(node: ts.Statement): boolean {

        if (ts.isExportAssignment(node)) {

            return true;
        }

        return this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
    }
}


/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";

/**
 * Checks if a node has a specific modifier
 */
export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    if (!ts.canHaveModifiers(node)) {
        return false;
    }
    const modifiers = ts.getModifiers(node);
    return modifiers ? modifiers.some(mod => mod.kind === kind) : false;
}
/**
 * Gets the name of a class member
 */
export function getMemberName(member: ts.ClassElement): string {
    if (ts.isConstructorDeclaration(member)) {
        return "constructor";
    }
    if ("name" in member && member.name) {
        if (ts.isIdentifier(member.name)) {
            return member.name.text;
        }
        if (ts.isStringLiteral(member.name)) {
            return member.name.text;
        }
        if (ts.isComputedPropertyName(member.name)) {
            return "[computed]";
        }
    }
    return "anonymous";
}

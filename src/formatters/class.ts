/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {ClassMember, compareMembers, DEFAULT_CLASS_ORDER, MemberType, SortConfig} from "../shared/classMemberTypes";
import {getMemberName, hasModifier} from "../shared/classMemberUtils";
import * as ts from "typescript";

function getMemberType(member: ts.ClassElement): MemberType {
    if (ts.isConstructorDeclaration(member)) {
        return MemberType.Constructor;
    }
    const isStatic = hasModifier(member, ts.SyntaxKind.StaticKeyword);
    if (ts.isPropertyDeclaration(member)) {
        return isStatic ? MemberType.StaticProperty : MemberType.InstanceProperty;
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return MemberType.GetAccessor;
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return MemberType.SetAccessor;
    }
    if (ts.isMethodDeclaration(member)) {
        return isStatic ? MemberType.StaticMethod : MemberType.InstanceMethod;
    }
    return MemberType.InstanceMethod;
}
function analyzeClassMember(member: ts.ClassElement, sourceFile: ts.SourceFile): ClassMember {
    const type = getMemberType(member);
    const name = getMemberName(member);
    const isStatic = hasModifier(member, ts.SyntaxKind.StaticKeyword);
    const isPublic =
        hasModifier(member, ts.SyntaxKind.PublicKeyword) ||
        (!hasModifier(member, ts.SyntaxKind.PrivateKeyword) && !hasModifier(member, ts.SyntaxKind.ProtectedKeyword));
    const isProtected = hasModifier(member, ts.SyntaxKind.ProtectedKeyword);
    const isPrivate = hasModifier(member, ts.SyntaxKind.PrivateKeyword);
    // Check for decorators using ts.getDecorators
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) : undefined;
    const hasDecorator = decorators ? decorators.length > 0 : false;
    // Get the full text including decorators and comments
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
export function sortClassMembers(members: ClassMember[], config: SortConfig = {}): ClassMember[] {
    const order = config.order || DEFAULT_CLASS_ORDER;
    return [...members].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);
        return compareMembers(a, b, aTypeIndex, bTypeIndex, config);
    });
}
export function transformClass(
    classNode: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    config: SortConfig,
): ts.ClassDeclaration {
    if (!classNode.members || classNode.members.length === 0) {
        return classNode;
    }
    // Analyze all members
    const analyzedMembers = classNode.members.map(member => analyzeClassMember(member, sourceFile));
    // Sort members
    const sortedMembers = sortClassMembers(analyzedMembers, config);
    // Create new class with sorted members
    return ts.factory.updateClassDeclaration(
        classNode,
        ts.getModifiers(classNode),
        classNode.name,
        classNode.typeParameters,
        classNode.heritageClauses,
        sortedMembers.map(m => m.node),
    );
}

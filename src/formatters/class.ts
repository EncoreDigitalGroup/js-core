/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {__extractClassMemberReferences} from "../shared/astTraversal";
import {ClassMember, __compareMembers, DEFAULT_CLASS_ORDER, MemberType, SortConfig} from "../shared/classMemberTypes";
import {__getMemberName, __hasModifier} from "../shared/classMemberUtils";
import {__reorderWithDependencies} from "../shared/dependencyAnalysis";
import * as ts from "typescript";

function getMemberType(member: ts.ClassElement): MemberType {
    if (ts.isConstructorDeclaration(member)) {
        return MemberType.Constructor;
    }
    const isStatic = __hasModifier(member, ts.SyntaxKind.StaticKeyword);
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

function analyzeClassMember(
    member: ts.ClassElement,
    sourceFile: ts.SourceFile,
    index: number,
    allMemberNames: Set<string>,
): ClassMember {
    const type = getMemberType(member);
    const name = __getMemberName(member);
    const isStatic = __hasModifier(member, ts.SyntaxKind.StaticKeyword);
    const isPublic =
        __hasModifier(member, ts.SyntaxKind.PublicKeyword) ||
        (!__hasModifier(member, ts.SyntaxKind.PrivateKeyword) &&
            !__hasModifier(member, ts.SyntaxKind.ProtectedKeyword));
    const isProtected = __hasModifier(member, ts.SyntaxKind.ProtectedKeyword);
    const isPrivate = __hasModifier(member, ts.SyntaxKind.PrivateKeyword);
    // Check for decorators using ts.getDecorators
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) : undefined;
    const hasDecorator = decorators ? decorators.length > 0 : false;
    // Get the full text including decorators and comments
    const text = member.getFullText(sourceFile);
    const allDependencies = __extractClassMemberReferences(member, allMemberNames);
    // Remove self-reference
    const dependencies = new Set(Array.from(allDependencies).filter(dep => dep !== name));

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
        originalIndex: index,
    };
}

export function __sortClassMembers(members: ClassMember[], config: SortConfig = {}): ClassMember[] {
    const order = config.order || DEFAULT_CLASS_ORDER;

    return [...members].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);

        return __compareMembers(a, b, aTypeIndex, bTypeIndex, config);
    });
}

export function __transformClass(
    classNode: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    config: SortConfig,
): ts.ClassDeclaration {
    if (!classNode.members || classNode.members.length === 0) {
        return classNode;
    }
    // Collect all member names first
    const allMemberNames = new Set<string>(
        classNode.members.map(m => __getMemberName(m)).filter(n => n && n !== "constructor"),
    );
    // Analyze all members
    const analyzedMembers = classNode.members.map((member, index) =>
        analyzeClassMember(member, sourceFile, index, allMemberNames),
    );
    // Sort members
    let sortedMembers = __sortClassMembers(analyzedMembers, config);
    // Apply dependency reordering if enabled
    if (config.respectDependencies !== false) {
        sortedMembers = __reorderWithDependencies(sortedMembers, m => m.name);
    }
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

/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {__extractClassMemberReferences} from "../shared/astTraversal";
import {ClassMember, __compareMembers, MemberType, SortConfig} from "../shared/classMemberTypes";
import {__getMemberName, __hasModifier} from "../shared/classMemberUtils";
import {__reorderWithDependencies} from "../shared/dependencyAnalysis";
import * as ts from "typescript";

// React-specific member types

export enum ReactMemberType {
    StaticProperty = "static_property",
    State = "state",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    ComponentDidMount = "componentDidMount",
    ShouldComponentUpdate = "shouldComponentUpdate",
    ComponentDidUpdate = "componentDidUpdate",
    ComponentWillUnmount = "componentWillUnmount",
    ComponentDidCatch = "componentDidCatch",
    GetDerivedStateFromProps = "getDerivedStateFromProps",
    GetDerivedStateFromError = "getDerivedStateFromError",
    GetSnapshotBeforeUpdate = "getSnapshotBeforeUpdate",
    EventHandler = "event_handler",
    RenderHelper = "render_helper",
    Render = "render",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor",
}

function isEventHandler(name: string): boolean {
    return /^(handle|on)[A-Z]/.test(name);
}

function isRenderHelper(name: string): boolean {
    return /^render[A-Z]/.test(name) && name !== "render";
}

function getReactMemberType(member: ts.ClassElement): ReactMemberType {
    if (ts.isConstructorDeclaration(member)) {
        return ReactMemberType.Constructor;
    }
    const isStatic = __hasModifier(member, ts.SyntaxKind.StaticKeyword);
    const name = __getMemberName(member);
    if (ts.isPropertyDeclaration(member)) {
        if (isStatic) {
            return ReactMemberType.StaticProperty;
        }
        if (name === "state") {
            return ReactMemberType.State;
        }

        return ReactMemberType.InstanceProperty;
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return ReactMemberType.GetAccessor;
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return ReactMemberType.SetAccessor;
    }
    if (ts.isMethodDeclaration(member)) {
        if (isStatic) {
            // Check for static lifecycle methods
            if (name === "getDerivedStateFromProps") {
                return ReactMemberType.GetDerivedStateFromProps;
            }
            if (name === "getDerivedStateFromError") {
                return ReactMemberType.GetDerivedStateFromError;
            }

            return ReactMemberType.StaticMethod;
        }
        // Check for lifecycle methods
        if (name === "componentDidMount") return ReactMemberType.ComponentDidMount;
        if (name === "shouldComponentUpdate") return ReactMemberType.ShouldComponentUpdate;
        if (name === "getSnapshotBeforeUpdate") return ReactMemberType.GetSnapshotBeforeUpdate;
        if (name === "componentDidUpdate") return ReactMemberType.ComponentDidUpdate;
        if (name === "componentWillUnmount") return ReactMemberType.ComponentWillUnmount;
        if (name === "componentDidCatch") return ReactMemberType.ComponentDidCatch;
        // Check for render
        if (name === "render") return ReactMemberType.Render;
        // Check for event handlers
        if (isEventHandler(name)) return ReactMemberType.EventHandler;
        // Check for render helpers
        if (isRenderHelper(name)) return ReactMemberType.RenderHelper;

        return ReactMemberType.InstanceMethod;
    }

    return ReactMemberType.InstanceMethod;
}

function analyzeReactMember(
    member: ts.ClassElement,
    sourceFile: ts.SourceFile,
    index: number,
    allMemberNames: Set<string>,
): ClassMember {
    const type = getReactMemberType(member) as unknown as MemberType;
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

export function __isReactComponent(classNode: ts.ClassDeclaration): boolean {
    if (!classNode.heritageClauses) {
        return false;
    }
    for (const clause of classNode.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of clause.types) {
                const typeName = type.expression.getText();
                if (
                    typeName === "Component" ||
                    typeName === "PureComponent" ||
                    typeName === "React.Component" ||
                    typeName === "React.PureComponent"
                ) {
                    return true;
                }
            }
        }
    }

    return false;
}

export const DEFAULT_REACT_ORDER: ReactMemberType[] = [
    ReactMemberType.StaticProperty,
    ReactMemberType.State,
    ReactMemberType.InstanceProperty,
    ReactMemberType.Constructor,
    ReactMemberType.GetDerivedStateFromProps,
    ReactMemberType.ComponentDidMount,
    ReactMemberType.ShouldComponentUpdate,
    ReactMemberType.GetSnapshotBeforeUpdate,
    ReactMemberType.ComponentDidUpdate,
    ReactMemberType.ComponentWillUnmount,
    ReactMemberType.ComponentDidCatch,
    ReactMemberType.GetDerivedStateFromError,
    ReactMemberType.EventHandler,
    ReactMemberType.RenderHelper,
    ReactMemberType.GetAccessor,
    ReactMemberType.SetAccessor,
    ReactMemberType.Render,
    ReactMemberType.StaticMethod,
    ReactMemberType.InstanceMethod,
];

export function __sortReactMembers(members: ClassMember[], config: SortConfig = {}): ClassMember[] {
    const order = (config.order as unknown as ReactMemberType[]) || DEFAULT_REACT_ORDER;

    return [...members].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type as unknown as ReactMemberType);
        const bTypeIndex = order.indexOf(b.type as unknown as ReactMemberType);

        return __compareMembers(a, b, aTypeIndex, bTypeIndex, config);
    });
}

export function __transformReactComponent(
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
        analyzeReactMember(member, sourceFile, index, allMemberNames),
    );
    // Sort members
    let sortedMembers = __sortReactMembers(analyzedMembers, config);
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

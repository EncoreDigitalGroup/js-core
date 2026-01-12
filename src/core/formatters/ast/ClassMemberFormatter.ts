/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { ClassMemberConfig } from "../../../config/types";
import { ASTAnalyzer } from "../../ast/ASTAnalyzer";
import { ASTTransformer } from "../../ast/ASTTransformer";
import { DependencyResolver } from "../../ast/DependencyResolver";
import { ASTFormatter } from "./ASTFormatter";
/**
* Types of class members
*/

export enum MemberType {

    StaticProperty = "static_property",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor"
}

/**
* Analyzed class member with metadata
*/

export interface ClassMember {

    node: ts.ClassElement;
    type: MemberType;
    name: string;
    isPublic: boolean;
    isProtected: boolean;
    isPrivate: boolean;
    isStatic: boolean;
    hasDecorator: boolean;
    text: string;
    dependencies?: Set<string>;
    originalIndex?: number;
}

/**
* Default order for class members
*/

export const DEFAULT_CLASS_ORDER: MemberType[] = [

    MemberType.StaticProperty,
    MemberType.InstanceProperty,
    MemberType.Constructor,
    MemberType.GetAccessor,
    MemberType.SetAccessor,
    MemberType.StaticMethod,
    MemberType.InstanceMethod,
];

/**
* Formats class members by sorting them according to configured order
*/

export class ClassMemberFormatter extends ASTFormatter {

    readonly name = "ClassMemberFormatter";
    constructor(private readonly config: ClassMemberConfig) {
        super();
    }

    /**
    * Determine the type of a class member
    */
    private getMemberType(member: ts.ClassElement): MemberType {

        if (ts.isConstructorDeclaration(member)) {

            return MemberType.Constructor;
        }

        const isStatic = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.StaticKeyword);

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

    /**
    * Analyze a class member to extract metadata
    */
    private analyzeClassMember(member: ts.ClassElement, sourceFile: ts.SourceFile, index: number, allMemberNames: Set<string>): ClassMember {

        const type = this.getMemberType(member);
        const name = ASTAnalyzer.getClassMemberName(member);
        const isStatic = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.StaticKeyword);
        const isPublic = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.PublicKeyword) ||

            (!ASTAnalyzer.hasModifier(member, ts.SyntaxKind.PrivateKeyword) &&
                !ASTAnalyzer.hasModifier(member, ts.SyntaxKind.ProtectedKeyword));

        const isProtected = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.ProtectedKeyword);
        const isPrivate = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.PrivateKeyword);
        // Check for decorators
        const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) : undefined;
        const hasDecorator = decorators ? decorators.length > 0 : false;
        // Get the full text including decorators and comments
        const text = member.getFullText(sourceFile);
        // Extract dependencies
        const allDependencies = ASTAnalyzer.extractClassMemberReferences(member, allMemberNames);
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

    /**
    * Compare two class members for sorting
    */
    private compareMembers(a: ClassMember, b: ClassMember, aTypeIndex: number, bTypeIndex: number): number {
        // First, sort by member type according to the defined order

        if (aTypeIndex !== bTypeIndex) {

            return aTypeIndex - bTypeIndex;
        }
        // Within the same type, sort by visibility if configured

        if (this.config.groupByVisibility) {
            if (a.isPublic !== b.isPublic)

                return a.isPublic ? -1 : 1;

            if (a.isProtected !== b.isProtected)

                return a.isProtected ? -1 : 1;

            if (a.isPrivate !== b.isPrivate)

                return a.isPrivate ? -1 : 1;
        }
        // Finally, maintain alphabetical order by name
        return a.name.localeCompare(b.name);
    }

    /**
    * Sort class members according to configuration
    */
    private sortClassMembers(members: ClassMember[]): ClassMember[] {

        const order = this.config.order || DEFAULT_CLASS_ORDER;

        return [...members].sort((a, b) => {

            const aTypeIndex = order.indexOf(a.type);
            const bTypeIndex = order.indexOf(b.type);

            return this.compareMembers(a, b, aTypeIndex, bTypeIndex);
        });
    }

    /**
    * Transform a class declaration by sorting its members
    */
    private transformClass(classNode: ts.ClassDeclaration, sourceFile: ts.SourceFile): ts.ClassDeclaration {

        if (!classNode.members || classNode.members.length === 0) {

            return classNode;
        }
        // Collect all member names first

        const allMemberNames = new Set<string>(classNode.members

            .map(m => ASTAnalyzer.getClassMemberName(m))
            .filter(n => n && n !== "constructor"));
        // Analyze all members

        const analyzedMembers = classNode.members.map((member, index) => this.analyzeClassMember(member, sourceFile, index, allMemberNames));
        // Sort members

        let sortedMembers = this.sortClassMembers(analyzedMembers);
        // Apply dependency reordering if enabled

        if (this.config.respectDependencies !== false) {

            sortedMembers = DependencyResolver.reorderWithDependencies(sortedMembers, m => m.name);
        }
        // Create new class with sorted members
        return ASTTransformer.reorderClassMembers(classNode, sortedMembers.map(m => m.node));
    }
    async format(source: string, filePath: string): Promise<string> {

        if (!this.config.enabled) {

            return source;
        }

        const sourceFile = this.createSourceFile(source, filePath);
        const transformed = this.transformSourceFile(sourceFile, node => {

            if (ts.isClassDeclaration(node)) {

                return this.transformClass(node, sourceFile);
            }

            return undefined;
        });

        const formatted = this.printSourceFile(transformed);

        this.logFormat(filePath, formatted !== source);

        return formatted;
    }
}

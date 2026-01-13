/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { ASTAnalyzer } from "../../../ast/ASTAnalyzer";
import { DependencyResolver } from "../../../ast/DependencyResolver";
import { ClassMemberConfig } from "../../../config";
import { IFormattingRule } from "../../IFormattingRule";


/** Types of class members */

export enum MemberType {
    StaticProperty = "static_property",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor"
}

/** Analyzed class member with metadata */

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

/** Default order for class members */

export const DEFAULT_CLASS_ORDER: MemberType[] = [

    MemberType.StaticProperty,
    MemberType.InstanceProperty,
    MemberType.Constructor,
    MemberType.GetAccessor,
    MemberType.SetAccessor,
    MemberType.StaticMethod,
    MemberType.InstanceMethod,
];

/** Sorts class members according to configured order */

export class ClassMemberSortingRule implements IFormattingRule {
    readonly name = "ClassMemberSortingRule";

    constructor(private readonly config: ClassMemberConfig) {
    }

    /** Determine the type of a class member */
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

    /** Analyze a class member to extract metadata */
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

    private createSourceFile(source: string, filePath: string): ts.SourceFile {
        return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    }

    /** Compare two class members for sorting */
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

    /** Sort class members according to configuration */
    private sortClassMembers(members: ClassMember[]): ClassMember[] {
        const order = this.config.order || DEFAULT_CLASS_ORDER;

        return [...members].sort((a, b) => {
            const aTypeIndex = order.indexOf(a.type);
            const bTypeIndex = order.indexOf(b.type);

            return this.compareMembers(a, b, aTypeIndex, bTypeIndex);
        });
    }

    apply(source: string, filePath?: string): string {
        if (!this.config.enabled) {
            return source;
        }

        const sourceFile = this.createSourceFile(source, filePath || "temp.ts");

        let formatted = source;

        // Find all class declarations and reorder their members

        const classes: ts.ClassDeclaration[] = [];
        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node)) {
                classes.push(node);
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);

        // Process classes in reverse order to maintain correct positions

        for (let i = classes.length - 1; i >= 0; i--) {
            const classNode = classes[i];

            if (!classNode.members || classNode.members.length === 0) {
                continue;
            }

            // Analyze and sort members

            const allMemberNames = new Set<string>(classNode.members

                .map(m => ASTAnalyzer.getClassMemberName(m))
                .filter(n => n && n !== "constructor"));

            const analyzedMembers = classNode.members.map((member, index) =>

                this.analyzeClassMember(member, sourceFile, index, allMemberNames)
            );

            let sortedMembers = this.sortClassMembers(analyzedMembers);

            if (this.config.respectDependencies !== false) {
                sortedMembers = DependencyResolver.reorderWithDependencies(sortedMembers, m => m.name);
            }

            // Check if reordering is needed

            const orderChanged = sortedMembers.some((member, index) => member.originalIndex !== index);

            if (!orderChanged) {
                continue;
            }

            // Reconstruct class body with reordered members using original text

            const firstMember = classNode.members[0];
            const lastMember = classNode.members[classNode.members.length - 1];
            const classBodyStart = firstMember.getFullStart();
            const classBodyEnd = lastMember.getEnd();

            // Build new class body from sorted member texts
            const memberTexts = sortedMembers.map(m => m.text.trim());
            const newClassBody = memberTexts.join("\n\n");

            // Replace the class body (add leading newline for proper spacing)

            formatted = formatted.substring(0, classBodyStart) + "\n" + newClassBody + formatted.substring(classBodyEnd);
        }

        // Remove trailing semicolons that TypeScript printer adds after closing braces
        formatted = formatted.replace(/(\n;)+\s*$/, "\n");

        return formatted;
    }
}


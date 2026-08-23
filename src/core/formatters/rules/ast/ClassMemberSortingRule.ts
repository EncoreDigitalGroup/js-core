/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";
import {ASTAnalyzer} from "../../../ast/ASTAnalyzer";
import {DependencyResolver} from "../../../ast/DependencyResolver";
import {MemberType} from "../../../config/ConfigTypes";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

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
export class ClassMemberSortingRule extends BaseFormattingRule {
    readonly name = "ClassMemberSortingRule";

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
        const isPublic = ASTAnalyzer.hasModifier(member, ts.SyntaxKind.PublicKeyword)
            || (!ASTAnalyzer.hasModifier(member, ts.SyntaxKind.PrivateKeyword)
                && !ASTAnalyzer.hasModifier(member, ts.SyntaxKind.ProtectedKeyword));

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

    /** Compare two class members for sorting */
    private compareMembers(a: ClassMember, b: ClassMember, aTypeIndex: number, bTypeIndex: number): number {
        // First, sort by member type according to the defined order
        if (aTypeIndex !== bTypeIndex) {
            return aTypeIndex - bTypeIndex;
        }

        // Within the same type, sort by visibility if configured
        const config = this.getSortingConfig()?.classMembers;
        if (config?.groupByVisibility) {
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
        const config = this.getSortingConfig()?.classMembers;
        const order = config?.order || DEFAULT_CLASS_ORDER;

        return [...members].sort((a, b) => {
            const aTypeIndex = order.indexOf(a.type);
            const bTypeIndex = order.indexOf(b.type);
            return this.compareMembers(a, b, aTypeIndex, bTypeIndex);
        });
    }

    /**
     * Re-anchors a member's `getFullText()` (leading trivia included) to the enclosing class
     * body's indentation: strips only the leading blank lines that separated it from whatever
     * preceded it in its *original* position, leaving the member's own indentation, leading
     * comments, and internal (multi-line body, including JSX render bodies) formatting completely
     * untouched. Never `.trim()`s to column 0 the way the pre-migration reconstruction did.
     */
    private reanchorToEnclosingIndent(fullText: string): string {
        return fullText.replace(/^\n+/, "");
    }

    override applyToContext(context: FormatContext): void {
        const config = this.getSortingConfig()?.classMembers;
        if (!config?.enabled) {
            return;
        }

        // The shared project already parses this file with the correct ScriptKind (TSX for
        // .tsx/.jsx), so JSX render-method bodies are structurally sound on this tree.
        const sourceFile = context.sourceFile.compilerNode;
        const originalText = context.getText();
        let formatted = originalText;

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

            if (config.respectDependencies !== false) {
                sortedMembers = DependencyResolver.reorderWithDependencies(sortedMembers, m => m.name);
            }

            // Check if reordering is needed
            const orderChanged = sortedMembers.some((member, index) => member.originalIndex !== index);
            if (!orderChanged) {
                continue;
            }

            // Reconstruct class body with reordered members using each member's original text,
            // re-anchored to the class body's indentation — never trimmed to column 0, and never
            // touching a multi-line member's internal formatting (JSX render bodies included).
            const firstMember = classNode.members[0];
            const lastMember = classNode.members[classNode.members.length - 1];
            const classBodyStart = firstMember.getFullStart();
            const classBodyEnd = lastMember.getEnd();

            // Build new class body from sorted member texts
            const memberTexts = sortedMembers.map(m => this.reanchorToEnclosingIndent(m.text));
            const newClassBody = memberTexts.join("\n\n");

            // Replace the class body (add leading newline for proper spacing)
            formatted = formatted.substring(0, classBodyStart) + "\n" + newClassBody + formatted.substring(classBodyEnd);
        }

        if (formatted !== originalText) {
            context.sourceFile.replaceWithText(formatted);
        }
    }
}

export {MemberType};
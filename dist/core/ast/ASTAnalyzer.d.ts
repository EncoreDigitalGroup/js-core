import * as ts from "typescript";
export interface ReferenceInfo {
    identifiers: Set<string>;
    thisReferences: Set<string>;
    directCalls: Set<string>;
}
export declare class ASTAnalyzer {
    static extractReferences(node: ts.Node, scopeFilter?: (name: string) => boolean): ReferenceInfo;
    static extractClassMemberReferences(member: ts.ClassElement, availableMembers: Set<string>): Set<string>;
    static extractFileDeclarationReferences(declaration: ts.Statement, availableDeclarations: Set<string>): Set<string>;
    static getClassMemberName(member: ts.ClassElement): string;
    static getDeclarationName(declaration: ts.Statement): string;
    static hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean;
    static isDefaultExport(node: ts.Statement): boolean;
    static isExported(node: ts.Statement): boolean;
}

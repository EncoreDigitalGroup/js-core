import * as ts from "typescript";
export interface ReferenceInfo {
    identifiers: Set<string>;
    thisReferences: Set<string>;
    directCalls: Set<string>;
}
export declare function extractReferences(node: ts.Node, scopeFilter?: (name: string) => boolean): ReferenceInfo;
export declare function extractClassMemberReferences(member: ts.ClassElement, availableMembers: Set<string>): Set<string>;
export declare function extractFileDeclarationReferences(declaration: ts.Statement, availableDeclarations: Set<string>): Set<string>;

import * as ts from "typescript";
export declare class ASTTransformer {
    static createSourceFile(source: string, filePath: string): ts.SourceFile;
    static printNode(node: ts.Node, sourceFile: ts.SourceFile, removeComments?: boolean): string;
    static printSourceFile(sourceFile: ts.SourceFile): string;
    static reorderClassMembers(classNode: ts.ClassDeclaration, orderedMembers: ts.ClassElement[]): ts.ClassDeclaration;
    static reorderSourceFileStatements(sourceFile: ts.SourceFile, orderedStatements: ts.Statement[]): ts.SourceFile;
    static transformSourceFile(sourceFile: ts.SourceFile, visitor: (node: ts.Node) => ts.Node | undefined): ts.SourceFile;
}

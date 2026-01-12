/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
import * as ts from "typescript";
/**
* Transforms TypeScript AST nodes by reordering children
*/

export class ASTTransformer {

    /**
    * Create a source file from source code
    */

    static createSourceFile(source: string, filePath: string): ts.SourceFile {

        const scriptKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")

            ? ts.ScriptKind.TSX
            : ts.ScriptKind.TS;

        return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
    }

    /**
    * Print a node to string using TypeScript printer
    */
    static printNode(node: ts.Node, sourceFile: ts.SourceFile, removeComments = false): string {

        const printer = ts.createPrinter({

            newLine: ts.NewLineKind.LineFeed,
            removeComments,
        });

        return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
    }

    /**
    * Print a source file to string
    * Extracts and deduplicates leading comments to prevent duplication during formatting
    */
    static printSourceFile(sourceFile: ts.SourceFile): string {
        const fullText = sourceFile.getFullText();

        // Extract ALL leading block comments (not just the first one)
        const leadingCommentsMatch = fullText.match(/^((?:\/\*[\s\S]*?\*\/\s*)+)/);
        let leadingComments = leadingCommentsMatch ? leadingCommentsMatch[1].trim() : "";

        // Deduplicate consecutive identical block comments (fixes copyright duplication)
        if (leadingComments) {
            const commentBlocks = leadingComments.match(/\/\*[\s\S]*?\*\//g) || [];
            const uniqueBlocks = new Set(commentBlocks.map(block => block.trim()));

            leadingComments = Array.from(uniqueBlocks).join("\n");
        }

        const printer = ts.createPrinter({

            newLine: ts.NewLineKind.LineFeed,
            removeComments: false,
        });

        // Print the file content
        let printed = printer.printFile(sourceFile);

        // Remove trailing semicolons that TypeScript printer adds after closing braces
        printed = printed.replace(/(\n;)+\s*$/, "\n");

        // If we have leading comments, prepend them with proper spacing
        if (leadingComments) {
            // Remove any duplicate leading comments from the printed output
            const printedWithoutLeadingComments = printed.replace(/^((?:\/\*[\s\S]*?\*\/\s*)+)/, "").trimStart();
            return leadingComments + "\n\n" + printedWithoutLeadingComments;
        }

        return printed;
    }

    /**
    * Create a new class declaration with reordered members
    */
    static reorderClassMembers(classNode: ts.ClassDeclaration, orderedMembers: ts.ClassElement[]): ts.ClassDeclaration {

        return ts.factory.updateClassDeclaration(classNode, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, orderedMembers);
    }

    /**
    * Create a new source file with reordered statements
    */
    static reorderSourceFileStatements(sourceFile: ts.SourceFile, orderedStatements: ts.Statement[]): ts.SourceFile {

        return ts.factory.updateSourceFile(sourceFile, orderedStatements, sourceFile.isDeclarationFile, sourceFile.referencedFiles, sourceFile.typeReferenceDirectives, sourceFile.hasNoDefaultLib, sourceFile.libReferenceDirectives);
    }

    /**
    * Transform a source file by visiting all nodes
    */
    static transformSourceFile(sourceFile: ts.SourceFile, visitor: (node: ts.Node) => ts.Node | undefined): ts.SourceFile {

        const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
            const visit = (node: ts.Node): ts.Node => {
                const result = visitor(node);

                if (result)

                    return result;

                return ts.visitEachChild(node, visit, context);
            };

            return (node: ts.SourceFile) => ts.visitNode(node, visit) as ts.SourceFile;
        };

        const result = ts.transform(sourceFile, [transformer]);
        const transformedSourceFile = result.transformed[0];

        result.dispose();

        return transformedSourceFile;
    }
}

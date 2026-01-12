/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { ASTTransformer } from "../../ast/ASTTransformer";
import { BaseFormatter } from "../base/BaseFormatter";


/**
* Base class for formatters that work with TypeScript AST transformations
*/

export abstract class ASTFormatter extends BaseFormatter {
    /**
    * Create a TypeScript source file from source code
    */
    protected createSourceFile(source: string, filePath: string): ts.SourceFile {
        return ASTTransformer.createSourceFile(source, filePath);
    }

    /**
    * Default implementation uses TypeScript AST
    */
    protected getSupportedExtensions(): string[] {
        return [".ts", ".tsx"];
    }

    /**
    * Print a node to string
    */
    protected printNode(node: ts.Node, sourceFile: ts.SourceFile): string {
        return ASTTransformer.printNode(node, sourceFile);
    }

    /**
    * Print a source file back to string
    */
    protected printSourceFile(sourceFile: ts.SourceFile): string {
        return ASTTransformer.printSourceFile(sourceFile);
    }

    /**
    * Transform source file with a visitor function
    */
    protected transformSourceFile(sourceFile: ts.SourceFile, visitor: (node: ts.Node) => ts.Node | undefined): ts.SourceFile {
        return ASTTransformer.transformSourceFile(sourceFile, visitor);
    }
}

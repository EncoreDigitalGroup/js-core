/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {transformClass} from "./formatters/class";
import {isReactComponent, transformReactComponent} from "./formatters/react";
import {SortConfig} from "./shared/classMemberTypes";
import fs from "fs";
import * as ts from "typescript";

function createTransformer(config: SortConfig): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visit(node: ts.Node): ts.Node {
                if (ts.isClassDeclaration(node)) {
                    // Check if it's a React component
                    if (isReactComponent(node)) {
                        return transformReactComponent(node, sourceFile, config);
                    }
                    // Otherwise, treat as regular TypeScript class
                    return transformClass(node, sourceFile, config);
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(sourceFile, visit) as ts.SourceFile;
        };
    };
}
export function sortClassMembersInFile(filePath: string, config: SortConfig = {}): string {
    const sourceCode = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    // Transform the source file
    const result = ts.transform(sourceFile, [createTransformer(config)]);
    const transformedSourceFile = result.transformed[0];
    // Print the transformed source file
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
    });
    const output = printer.printFile(transformedSourceFile);
    result.dispose();
    if (!config.dryRun) {
        fs.writeFileSync(filePath, output, "utf8");
        console.log(`✨ Sorted class members in: ${filePath}`);
    }
    return output;
}
export function sortClassMembersInDirectory(targetDir: string, config: SortConfig = {}): void {
    const glob = require("glob");
    const files = glob.sync("**/*.{ts,tsx,js,jsx}", {
        cwd: targetDir,
        ignore: ["node_modules/**", "dist/**", "build/**", "vendor/**"],
        absolute: true,
    });
    console.info(`Sorting class members in ${files.length} files...`);
    for (const file of files) {
        try {
            sortClassMembersInFile(file, config);
        } catch (error) {
            console.error(`Error sorting file ${file}:`, (error as Error).message);
        }
    }
}

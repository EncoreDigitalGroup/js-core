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

/**
 * Adds blank lines between top-level declarations
 */
function addBlankLinesBetweenDeclarations(code: string): string {
    const lines = code.split("\n");
    const result: string[] = [];
    let previousLineWasDeclaration = false;
    let inMultiLineDeclaration = false;
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        // Track brace depth to know when we're in a multi-line declaration
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        const isBlankLine = trimmedLine === "";
        const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*");
        const isDeclarationStart =
            !isComment &&
            (trimmedLine.startsWith("export ") ||
                trimmedLine.startsWith("function ") ||
                trimmedLine.startsWith("const ") ||
                trimmedLine.startsWith("let ") ||
                trimmedLine.startsWith("var ") ||
                trimmedLine.startsWith("enum ") ||
                trimmedLine.startsWith("interface ") ||
                trimmedLine.startsWith("type ") ||
                trimmedLine.startsWith("class ") ||
                trimmedLine.startsWith("import "));
        // Check if we're in a multi-line declaration
        if (isDeclarationStart && braceDepth > 0) {
            inMultiLineDeclaration = true;
        }
        if (inMultiLineDeclaration && braceDepth === 0) {
            inMultiLineDeclaration = false;
        }
        // Add blank line before declaration if previous line was a declaration and this is a new one
        if (
            isDeclarationStart &&
            previousLineWasDeclaration &&
            !inMultiLineDeclaration &&
            result.length > 0 &&
            result[result.length - 1].trim() !== ""
        ) {
            result.push("");
        }
        result.push(line);
        // Update state
        if (!isBlankLine && !isComment && (isDeclarationStart || !inMultiLineDeclaration)) {
            previousLineWasDeclaration = isDeclarationStart || (previousLineWasDeclaration && braceDepth === 0);
        } else if (isBlankLine) {
            previousLineWasDeclaration = false;
        }
    }
    return result.join("\n");
}

/**
 * Adds blank lines before return statements (unless there's a comment directly above)
 */
function addBlankLinesBeforeReturns(code: string): string {
    const lines = code.split("\n");
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const trimmedCurrentLine = currentLine.trim();
        const previousLine = i > 0 ? lines[i - 1] : "";
        const trimmedPreviousLine = previousLine.trim();

        // Check if current line is a return statement
        const isReturnStatement = trimmedCurrentLine.startsWith("return ");

        // Check if previous line is a comment or blank
        const previousIsComment =
            trimmedPreviousLine.startsWith("//") ||
            trimmedPreviousLine.startsWith("/*") ||
            trimmedPreviousLine.startsWith("*") ||
            trimmedPreviousLine.endsWith("*/");
        const previousIsBlank = trimmedPreviousLine === "";

        // Add blank line before return if:
        // - It's a return statement
        // - Previous line is not blank
        // - Previous line is not a comment
        // - We have at least one line before
        if (isReturnStatement && !previousIsBlank && !previousIsComment && i > 0) {
            result.push("");
        }

        result.push(currentLine);
    }

    return result.join("\n");
}

/**
 * Checks if a source file contains any class declarations
 */
function hasClassDeclarations(sourceFile: ts.SourceFile): boolean {
    let hasClass = false;

    function visit(node: ts.Node): void {
        if (ts.isClassDeclaration(node)) {
            hasClass = true;
            return;
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return hasClass;
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
    // Skip files without class declarations
    if (!hasClassDeclarations(sourceFile)) {
        return sourceCode;
    }
    // Transform the source file
    const result = ts.transform(sourceFile, [createTransformer(config)]);
    const transformedSourceFile = result.transformed[0];
    // Print the transformed source file
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
    });
    let output = printer.printFile(transformedSourceFile);
    // Add blank lines between top-level declarations
    output = addBlankLinesBetweenDeclarations(output);
    // Add blank lines before return statements
    output = addBlankLinesBeforeReturns(output);
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

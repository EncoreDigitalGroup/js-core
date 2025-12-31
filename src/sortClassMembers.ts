/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {transformClass} from "./formatters/class";
import {transformFile} from "./formatters/file";
import {isReactComponent, transformReactComponent} from "./formatters/react";
import {SortConfig} from "./shared/classMemberTypes";
import fs from "fs";
import * as ts from "typescript";

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

 * Adds blank lines between top-level declarations
 */
function addBlankLinesBetweenDeclarations(code: string): string {
    const lines = code.split("\n");
    const result: string[] = [];
    let braceDepth = 0;
    let inImportSection = true;
    let lastNonBlankLineWasDeclarationEnd = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        // Track brace depth
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        const isBlankLine = trimmedLine === "";
        const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*");
        const isBlockCommentStart = trimmedLine.startsWith("/*") && !trimmedLine.endsWith("*/");
        const isImport = trimmedLine.startsWith("import ");
        const isDeclarationStart =
            !isComment &&
            !isImport &&
            braceDepth === 0 &&
            (trimmedLine.startsWith("export ") ||
                trimmedLine.startsWith("function ") ||
                trimmedLine.startsWith("const ") ||
                trimmedLine.startsWith("let ") ||
                trimmedLine.startsWith("var ") ||
                trimmedLine.startsWith("enum ") ||
                trimmedLine.startsWith("interface ") ||
                trimmedLine.startsWith("type ") ||
                trimmedLine.startsWith("class "));
        // Check if we've left the import section
        if (inImportSection && !isImport && !isBlankLine && !isComment) {
            inImportSection = false;
        }
        // Add blank line before declaration if needed
        if (!inImportSection && braceDepth === 0) {
            // Add blank line before block comments that precede declarations
            if (
                isBlockCommentStart &&
                lastNonBlankLineWasDeclarationEnd &&
                result.length > 0 &&
                result[result.length - 1].trim() !== ""
            ) {
                result.push("");
                lastNonBlankLineWasDeclarationEnd = false;
            }
            // Add blank line before declaration starts
            else if (
                isDeclarationStart &&
                lastNonBlankLineWasDeclarationEnd &&
                result.length > 0 &&
                result[result.length - 1].trim() !== ""
            ) {
                result.push("");
                lastNonBlankLineWasDeclarationEnd = false;
            }
        }
        result.push(line);
        // Update brace depth
        braceDepth += openBraces - closeBraces;
        // Track declaration ends (when we're at depth 0 after a closing brace or semicolon)
        if (!isBlankLine) {
            if (braceDepth === 0 && (trimmedLine === "}" || trimmedLine.endsWith("}") || trimmedLine.endsWith(";"))) {
                lastNonBlankLineWasDeclarationEnd = true;
            } else if (!isComment) {
                // Reset if we hit a non-comment, non-declaration-end line
                if (!isBlockCommentStart && trimmedLine !== "") {
                    lastNonBlankLineWasDeclarationEnd = isDeclarationStart;
                }
            }
        }
    }

    return result.join("\n");
}
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
export function sortClassMembersInDirectory(targetDir: string, config: SortConfig = {}): void {
    const glob = require("glob");
    const files = glob.sync("**/*.{ts,tsx,js,jsx}", {
        cwd: targetDir,
        ignore: ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"],
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
export function sortClassMembersInFile(filePath: string, config: SortConfig = {}): string {
    const sourceCode = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    // First, sort top-level declarations (interfaces, functions, etc.)
    let transformedSourceFile = transformFile(sourceFile);
    // Then, if the file has classes, sort class members
    if (hasClassDeclarations(sourceFile)) {
        const result = ts.transform(transformedSourceFile, [createTransformer(config)]);
        transformedSourceFile = result.transformed[0];
        result.dispose();
    }
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
    // Only write if the output is different from the source
    if (output !== sourceCode && !config.dryRun) {
        fs.writeFileSync(filePath, output, "utf8");
        console.log(`✨ Sorted declarations in: ${filePath}`);
    }

    return output;
}

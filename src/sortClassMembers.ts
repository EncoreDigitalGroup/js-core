/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import type {CoreConfig} from "./config";
import {transformClass} from "./formatters/class";
import {transformFile, FileSortConfig} from "./formatters/file";
import {isReactComponent, transformReactComponent} from "./formatters/react";
import {SortConfig} from "./shared/classMemberTypes";
import fs from "fs";
import * as ts from "typescript";

/**
 * Configuration for sorting class members in a directory
 */

export interface SortClassMembersConfig {
    dryRun?: boolean;
    debug?: boolean;
    classConfig?: SortConfig | null;
    reactConfig?: SortConfig | null;
    fileConfig?: FileSortConfig | null;
    include?: string[];
    exclude?: string[];
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
 * Adds blank lines between top-level declarations
 */
function addBlankLinesBetweenDeclarations(code: string, debug: boolean = false): string {
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
        if (debug) {
            console.log(`Line ${i}: "${trimmedLine.substring(0, 50)}${trimmedLine.length > 50 ? "..." : ""}"`);
            console.log(
                `  open:${openBraces} close:${closeBraces} depth:${braceDepth}->${braceDepth + openBraces - closeBraces}`,
            );
        }
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
        // Track declaration ends BEFORE updating brace depth
        // Check if this line will end at depth 0 (top level)
        const willBeAtDepthZero = braceDepth + openBraces - closeBraces === 0;
        const hasClosingElement = trimmedLine === "}" || trimmedLine.endsWith("}") || trimmedLine.endsWith(";");

        const isJustClosingBraces = /^[\s});]*$/.test(trimmedLine);
        if (!isBlankLine && willBeAtDepthZero && hasClosingElement) {
            lastNonBlankLineWasDeclarationEnd = true;
        } else if (!isBlankLine && !isComment) {
            // Don't reset if we're at depth 0 and the line is just closing braces
            // (this handles cases like }; }; } where multiple closes happen at top level)
            if (!isBlockCommentStart && trimmedLine !== "" && !(braceDepth === 0 && isJustClosingBraces)) {
                lastNonBlankLineWasDeclarationEnd = isDeclarationStart;
            }
        }
        // Update brace depth (clamp to 0 if it goes negative)
        braceDepth += openBraces - closeBraces;
        if (braceDepth < 0) {
            braceDepth = 0;
        }
    }

    return result.join("\n");
}

function createTransformer(
    classConfig: SortConfig | null | undefined,
    reactConfig: SortConfig | null | undefined,
): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visit(node: ts.Node): ts.Node {
                if (ts.isClassDeclaration(node)) {
                    // Check if it's a React component
                    if (isReactComponent(node)) {
                        if (reactConfig) {
                            return transformReactComponent(node, sourceFile, reactConfig);
                        }
                    } else if (classConfig) {
                        // Otherwise, treat as regular TypeScript class
                        return transformClass(node, sourceFile, classConfig);
                    }
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

/**
 * Internal function for sorting a single file with granular config options
 */
function sortFileInternal(config: CoreConfig, filePath: string, dryRun: boolean = false): string {
    const debug = config.debug || false;
    const classConfig = config.sorters?.classMembers?.enabled
        ? {
              order: config.sorters.classMembers.order,
              groupByVisibility: config.sorters.classMembers.groupByVisibility,
              respectDependencies: config.sorters.classMembers.respectDependencies,
          }
        : null;
    const reactConfig = config.sorters?.reactComponents?.enabled
        ? {
              order: config.sorters.reactComponents.order as any,
              groupByVisibility: config.sorters.reactComponents.groupByVisibility,
              respectDependencies: config.sorters.reactComponents.respectDependencies,
          }
        : null;
    const fileConfig = config.sorters?.fileDeclarations?.enabled
        ? {
              order: config.sorters.fileDeclarations.order,
              respectDependencies: config.sorters.fileDeclarations.respectDependencies,
          }
        : null;
    const sourceCode = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    // STEP 1: Sort top-level file declarations
    let transformedSourceFile = sourceFile;
    if (fileConfig) {
        transformedSourceFile = transformFile(sourceFile, fileConfig);
    }
    // STEP 2: Sort class members (if any classes exist and configs provided)
    if (hasClassDeclarations(sourceFile) && (classConfig || reactConfig)) {
        const result = ts.transform(transformedSourceFile, [createTransformer(classConfig, reactConfig)]);
        transformedSourceFile = result.transformed[0];
        result.dispose();
    }
    // STEP 3: Convert AST back to source code string
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
    });
    let output = printer.printFile(transformedSourceFile);
    // STEP 4: Final formatting - add blank lines
    output = addBlankLinesBetweenDeclarations(output, debug);
    output = addBlankLinesBeforeReturns(output);
    // Only write if the output is different from the source
    if (output !== sourceCode && !dryRun) {
        fs.writeFileSync(filePath, output, "utf8");
        console.log(`✨ Sorted declarations in: ${filePath}`);
    }

    return output;
}

export function sortClassMembersInDirectory(config: CoreConfig, targetDir: string, dryRun: boolean = false): void {
    const glob = require("glob");
    const include = config.sorters?.include || ["**/*.{ts,tsx}"];
    const exclude = config.sorters?.exclude || [];
    // Always exclude these critical directories
    const criticalExcludes = ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"];
    const finalExclude = [...new Set([...exclude, ...criticalExcludes])];
    const files = include.flatMap(pattern =>
        glob.sync(pattern, {
            cwd: targetDir,
            ignore: finalExclude,
            absolute: true,
        }),
    );
    console.info(`Sorting class members in ${files.length} files...`);
    for (const file of files) {
        try {
            sortFileInternal(config, file, dryRun);
        } catch (error) {
            console.error(`Error sorting file ${file}:`, (error as Error).message);
        }
    }
}

/**
 * Sorts class members in a single file (backward compatibility)
 * @deprecated Use sortFileInternal with CoreConfig for more control
 */
export function sortClassMembersInFile(config: CoreConfig, filePath: string, dryRun: boolean = false): string {
    return sortFileInternal(config, filePath, dryRun);
}

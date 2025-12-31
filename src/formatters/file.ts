/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";

export interface FileDeclaration {
    node: ts.Statement;
    type: DeclarationType;
    name: string;
    isExported: boolean;
    isDefaultExport: boolean;
    text: string;
}

export interface FileSortConfig {
    order?: DeclarationType[];
}

/**
 * Types of top-level declarations in a file
 */
export enum DeclarationType {
    Interface = "interface",
    TypeAlias = "type_alias",
    Enum = "enum",
    HelperFunction = "helper_function",
    HelperVariable = "helper_variable",
    ExportedFunction = "exported_function",
    ExportedVariable = "exported_variable",
    ExportedClass = "exported_class",
    DefaultExport = "default_export",
    Other = "other",
}

/**

 * Analyzes a top-level statement
 */
function analyzeDeclaration(node: ts.Statement, sourceFile: ts.SourceFile): FileDeclaration {
    const type = getDeclarationType(node);
    const name = getDeclarationName(node);
    const exported = isExported(node);
    const defaultExp = isDefaultExport(node);
    const text = node.getFullText(sourceFile);

    return {
        node,
        type,
        name,
        isExported: exported,
        isDefaultExport: defaultExp,
        text,
    };
}

/**
 * Gets the name of a declaration
 */
function getDeclarationName(node: ts.Statement): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
        return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration && ts.isIdentifier(declaration.name)) {
            return declaration.name.text;
        }
    }
    if (ts.isInterfaceDeclaration(node)) {
        return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node)) {
        return node.name.text;
    }
    if (ts.isEnumDeclaration(node)) {
        return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
        return node.name.text;
    }
    if (ts.isExportAssignment(node)) {
        return "default";
    }

    return "";
}

/**
 * Determines the type of a top-level declaration
 */
function getDeclarationType(node: ts.Statement): DeclarationType {
    const exported = isExported(node);
    const defaultExp = isDefaultExport(node);
    if (defaultExp) {
        return DeclarationType.DefaultExport;
    }
    if (ts.isInterfaceDeclaration(node)) {
        return DeclarationType.Interface;
    }
    if (ts.isTypeAliasDeclaration(node)) {
        return DeclarationType.TypeAlias;
    }
    if (ts.isEnumDeclaration(node)) {
        return DeclarationType.Enum;
    }
    if (ts.isFunctionDeclaration(node)) {
        return exported ? DeclarationType.ExportedFunction : DeclarationType.HelperFunction;
    }
    if (ts.isVariableStatement(node)) {
        return exported ? DeclarationType.ExportedVariable : DeclarationType.HelperVariable;
    }
    if (ts.isClassDeclaration(node)) {
        return exported ? DeclarationType.ExportedClass : DeclarationType.Other;
    }
    if (ts.isExportAssignment(node)) {
        return DeclarationType.DefaultExport;
    }

    return DeclarationType.Other;
}

/**
 * Checks if a statement is a default export
 */
function isDefaultExport(node: ts.Statement): boolean {
    if (ts.isExportAssignment(node)) {
        return true;
    }
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;

    return modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
}

/**
 * Checks if a statement has an export modifier
 */
function isExported(node: ts.Statement): boolean {
    if (ts.isExportAssignment(node)) {
        return true;
    }
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;

    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Sorts top-level declarations according to the specified order
 */
export function sortFileDeclarations(declarations: FileDeclaration[], config: FileSortConfig = {}): FileDeclaration[] {
    const order = config.order || DEFAULT_FILE_ORDER;

    return [...declarations].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);
        // Sort by type first
        if (aTypeIndex !== bTypeIndex) {
            return aTypeIndex - bTypeIndex;
        }
        // Within the same type, sort alphabetically by name
        return a.name.localeCompare(b.name);
    });
}

/**
 * Transforms a source file by sorting its top-level declarations
 */
export function transformFile(sourceFile: ts.SourceFile, config: FileSortConfig = {}): ts.SourceFile {
    // Separate import statements from other declarations
    const imports: ts.Statement[] = [];
    const otherStatements: ts.Statement[] = [];
    sourceFile.statements.forEach(statement => {
        if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
            imports.push(statement);
        } else {
            otherStatements.push(statement);
        }
    });
    // Analyze and sort non-import declarations
    const analyzedDeclarations = otherStatements.map(stmt => analyzeDeclaration(stmt, sourceFile));
    const sortedDeclarations = sortFileDeclarations(analyzedDeclarations, config);
    // Combine imports with sorted declarations
    const sortedStatements = [...imports, ...sortedDeclarations.map(d => d.node)];
    // Create new source file with sorted statements
    return ts.factory.updateSourceFile(sourceFile, sortedStatements);
}

/**
 * Default order for top-level declarations
 */
export const DEFAULT_FILE_ORDER: DeclarationType[] = [
    DeclarationType.Interface,
    DeclarationType.TypeAlias,
    DeclarationType.Enum,
    DeclarationType.HelperFunction,
    DeclarationType.HelperVariable,
    DeclarationType.ExportedFunction,
    DeclarationType.ExportedVariable,
    DeclarationType.ExportedClass,
    DeclarationType.DefaultExport,
    DeclarationType.Other,
];

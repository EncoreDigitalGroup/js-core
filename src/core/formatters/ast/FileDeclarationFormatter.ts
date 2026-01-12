/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as ts from "typescript";
import { FileDeclarationConfig } from "../../../config/types";
import { ASTAnalyzer } from "../../ast/ASTAnalyzer";
import { ASTTransformer } from "../../ast/ASTTransformer";
import { DependencyResolver } from "../../ast/DependencyResolver";
import { ASTFormatter } from "./ASTFormatter";
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
    Other = "other"
}

/**
* Analyzed file declaration with metadata
*/

export interface FileDeclaration {

    node: ts.Statement;
    type: DeclarationType;
    name: string;
    isExported: boolean;
    isDefaultExport: boolean;
    text: string;
    dependencies?: Set<string>;
    originalIndex?: number;
}

/**
* Default order for file declarations
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

/**
* Formats file-level declarations by sorting them according to configured order
*/

export class FileDeclarationFormatter extends ASTFormatter {

    readonly name = "FileDeclarationFormatter";
    constructor(private readonly config: FileDeclarationConfig) {
        super();
    }

    /**
    * Determine the type of a top-level declaration
    */
    private getDeclarationType(node: ts.Statement): DeclarationType {

        const exported = ASTAnalyzer.isExported(node);
        const defaultExp = ASTAnalyzer.isDefaultExport(node);

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
    * Analyze a top-level statement
    */
    private analyzeDeclaration(node: ts.Statement, sourceFile: ts.SourceFile, index: number, allDeclarationNames: Set<string>): FileDeclaration {

        const type = this.getDeclarationType(node);
        const name = ASTAnalyzer.getDeclarationName(node);
        const isExported = ASTAnalyzer.isExported(node);
        const isDefaultExport = ASTAnalyzer.isDefaultExport(node);
        const text = node.getFullText(sourceFile);
        // Extract dependencies
        const allDependencies = ASTAnalyzer.extractFileDeclarationReferences(node, allDeclarationNames);
        // Remove self-reference
        const dependencies = new Set(Array.from(allDependencies).filter(dep => dep !== name));

        return {
            node,
            type,
            name,
            isExported,
            isDefaultExport,
            text,
            dependencies,
            originalIndex: index,
        };
    }

    /**
    * Sort file declarations according to configuration
    */
    private sortFileDeclarations(declarations: FileDeclaration[]): FileDeclaration[] {

        const order = this.config.order || DEFAULT_FILE_ORDER;

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
    * Transform a source file by sorting its top-level declarations
    */
    private transformFile(sourceFile: ts.SourceFile): ts.SourceFile {
        // Separate import statements from other declarations

        const imports: ts.Statement[] = [];
        const otherStatements: ts.Statement[] = [];

        sourceFile.statements.forEach(statement => {

            if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {

                imports.push(statement);
            }

            else {

                otherStatements.push(statement);
            }
        });
        // Collect all declaration names first

        const allDeclarationNames = new Set<string>(otherStatements.map(stmt => ASTAnalyzer.getDeclarationName(stmt)).filter(n => n));
        // Analyze and sort non-import declarations
        const analyzedDeclarations = otherStatements.map((stmt, index) => this.analyzeDeclaration(stmt, sourceFile, index, allDeclarationNames));

        let sortedDeclarations = this.sortFileDeclarations(analyzedDeclarations);
        // Apply dependency reordering if enabled

        if (this.config.respectDependencies !== false) {

            sortedDeclarations = DependencyResolver.reorderWithDependencies(sortedDeclarations, d => d.name);
        }
        // Combine imports with sorted declarations

        const sortedStatements = [...imports, ...sortedDeclarations.map(d => d.node)];
        // Create new source file with sorted statements

        return ASTTransformer.reorderSourceFileStatements(sourceFile, sortedStatements);
    }
    async format(source: string, filePath: string): Promise<string> {

        if (!this.config.enabled) {

            return source;
        }

        const sourceFile = this.createSourceFile(source, filePath);
        const transformed = this.transformFile(sourceFile);
        const formatted = this.printSourceFile(transformed);

        this.logFormat(filePath, formatted !== source);

        return formatted;
    }
}

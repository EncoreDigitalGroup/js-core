"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FILE_ORDER = exports.DeclarationType = void 0;
exports.sortFileDeclarations = sortFileDeclarations;
exports.transformFile = transformFile;
const ts = __importStar(require("typescript"));
var DeclarationType;
(function (DeclarationType) {
    DeclarationType["Interface"] = "interface";
    DeclarationType["TypeAlias"] = "type_alias";
    DeclarationType["Enum"] = "enum";
    DeclarationType["HelperFunction"] = "helper_function";
    DeclarationType["HelperVariable"] = "helper_variable";
    DeclarationType["ExportedFunction"] = "exported_function";
    DeclarationType["ExportedVariable"] = "exported_variable";
    DeclarationType["ExportedClass"] = "exported_class";
    DeclarationType["DefaultExport"] = "default_export";
    DeclarationType["Other"] = "other";
})(DeclarationType || (exports.DeclarationType = DeclarationType = {}));
function analyzeDeclaration(node, sourceFile) {
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
function getDeclarationName(node) {
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
function getDeclarationType(node) {
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
function isDefaultExport(node) {
    if (ts.isExportAssignment(node)) {
        return true;
    }
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers)
        return false;
    return modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
}
function isExported(node) {
    if (ts.isExportAssignment(node)) {
        return true;
    }
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers)
        return false;
    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}
function sortFileDeclarations(declarations, config = {}) {
    const order = config.order || exports.DEFAULT_FILE_ORDER;
    return [...declarations].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);
        if (aTypeIndex !== bTypeIndex) {
            return aTypeIndex - bTypeIndex;
        }
        return a.name.localeCompare(b.name);
    });
}
function transformFile(sourceFile, config = {}) {
    const imports = [];
    const otherStatements = [];
    sourceFile.statements.forEach(statement => {
        if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
            imports.push(statement);
        }
        else {
            otherStatements.push(statement);
        }
    });
    const analyzedDeclarations = otherStatements.map(stmt => analyzeDeclaration(stmt, sourceFile));
    const sortedDeclarations = sortFileDeclarations(analyzedDeclarations, config);
    const sortedStatements = [...imports, ...sortedDeclarations.map(d => d.node)];
    return ts.factory.updateSourceFile(sourceFile, sortedStatements);
}
exports.DEFAULT_FILE_ORDER = [
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

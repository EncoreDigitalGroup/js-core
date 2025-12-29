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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortClassMembersInFile = sortClassMembersInFile;
exports.sortClassMembersInDirectory = sortClassMembersInDirectory;
const class_1 = require("./formatters/class");
const react_1 = require("./formatters/react");
const fs_1 = __importDefault(require("fs"));
const ts = __importStar(require("typescript"));
function createTransformer(config) {
    return (context) => {
        return (sourceFile) => {
            function visit(node) {
                if (ts.isClassDeclaration(node)) {
                    if ((0, react_1.isReactComponent)(node)) {
                        return (0, react_1.transformReactComponent)(node, sourceFile, config);
                    }
                    return (0, class_1.transformClass)(node, sourceFile, config);
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(sourceFile, visit);
        };
    };
}
function addBlankLinesBetweenDeclarations(code) {
    const lines = code.split("\n");
    const result = [];
    let previousLineWasDeclaration = false;
    let inMultiLineDeclaration = false;
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        const isBlankLine = trimmedLine === "";
        const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*");
        const isDeclarationStart = !isComment &&
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
        if (isDeclarationStart && braceDepth > 0) {
            inMultiLineDeclaration = true;
        }
        if (inMultiLineDeclaration && braceDepth === 0) {
            inMultiLineDeclaration = false;
        }
        if (isDeclarationStart &&
            previousLineWasDeclaration &&
            !inMultiLineDeclaration &&
            result.length > 0 &&
            result[result.length - 1].trim() !== "") {
            result.push("");
        }
        result.push(line);
        if (!isBlankLine && !isComment && (isDeclarationStart || !inMultiLineDeclaration)) {
            previousLineWasDeclaration = isDeclarationStart || (previousLineWasDeclaration && braceDepth === 0);
        }
        else if (isBlankLine) {
            previousLineWasDeclaration = false;
        }
    }
    return result.join("\n");
}
function addBlankLinesBeforeReturns(code) {
    const lines = code.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const trimmedCurrentLine = currentLine.trim();
        const previousLine = i > 0 ? lines[i - 1] : "";
        const trimmedPreviousLine = previousLine.trim();
        const isReturnStatement = trimmedCurrentLine.startsWith("return ");
        const previousIsComment = trimmedPreviousLine.startsWith("//") ||
            trimmedPreviousLine.startsWith("/*") ||
            trimmedPreviousLine.startsWith("*") ||
            trimmedPreviousLine.endsWith("*/");
        const previousIsBlank = trimmedPreviousLine === "";
        if (isReturnStatement && !previousIsBlank && !previousIsComment && i > 0) {
            result.push("");
        }
        result.push(currentLine);
    }
    return result.join("\n");
}
function hasClassDeclarations(sourceFile) {
    let hasClass = false;
    function visit(node) {
        if (ts.isClassDeclaration(node)) {
            hasClass = true;
            return;
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return hasClass;
}
function sortClassMembersInFile(filePath, config = {}) {
    const sourceCode = fs_1.default.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (!hasClassDeclarations(sourceFile)) {
        return sourceCode;
    }
    const result = ts.transform(sourceFile, [createTransformer(config)]);
    const transformedSourceFile = result.transformed[0];
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
    });
    let output = printer.printFile(transformedSourceFile);
    output = addBlankLinesBetweenDeclarations(output);
    output = addBlankLinesBeforeReturns(output);
    result.dispose();
    if (!config.dryRun) {
        fs_1.default.writeFileSync(filePath, output, "utf8");
        console.log(`✨ Sorted class members in: ${filePath}`);
    }
    return output;
}
function sortClassMembersInDirectory(targetDir, config = {}) {
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
        }
        catch (error) {
            console.error(`Error sorting file ${file}:`, error.message);
        }
    }
}

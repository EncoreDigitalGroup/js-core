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
exports.sortClassMembersInDirectory = sortClassMembersInDirectory;
exports.sortClassMembersInFile = sortClassMembersInFile;
const class_1 = require("./formatters/class");
const file_1 = require("./formatters/file");
const react_1 = require("./formatters/react");
const fs_1 = __importDefault(require("fs"));
const ts = __importStar(require("typescript"));
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
function addBlankLinesBetweenDeclarations(code) {
    const lines = code.split("\n");
    const result = [];
    let braceDepth = 0;
    let inImportSection = true;
    let lastNonBlankLineWasDeclarationEnd = false;
    const DEBUG = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        if (DEBUG) {
            console.log(`Line ${i}: "${trimmedLine.substring(0, 50)}${trimmedLine.length > 50 ? "..." : ""}"`);
            console.log(`  open:${openBraces} close:${closeBraces} depth:${braceDepth}->${braceDepth + openBraces - closeBraces}`);
        }
        const isBlankLine = trimmedLine === "";
        const isComment = trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*");
        const isBlockCommentStart = trimmedLine.startsWith("/*") && !trimmedLine.endsWith("*/");
        const isImport = trimmedLine.startsWith("import ");
        const isDeclarationStart = !isComment &&
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
        if (inImportSection && !isImport && !isBlankLine && !isComment) {
            inImportSection = false;
        }
        if (!inImportSection && braceDepth === 0) {
            if (isBlockCommentStart &&
                lastNonBlankLineWasDeclarationEnd &&
                result.length > 0 &&
                result[result.length - 1].trim() !== "") {
                result.push("");
                lastNonBlankLineWasDeclarationEnd = false;
            }
            else if (isDeclarationStart &&
                lastNonBlankLineWasDeclarationEnd &&
                result.length > 0 &&
                result[result.length - 1].trim() !== "") {
                result.push("");
                lastNonBlankLineWasDeclarationEnd = false;
            }
        }
        result.push(line);
        const willBeAtDepthZero = braceDepth + openBraces - closeBraces === 0;
        const hasClosingElement = trimmedLine === "}" || trimmedLine.endsWith("}") || trimmedLine.endsWith(";");
        const isJustClosingBraces = /^[\s});]*$/.test(trimmedLine);
        if (!isBlankLine && willBeAtDepthZero && hasClosingElement) {
            lastNonBlankLineWasDeclarationEnd = true;
        }
        else if (!isBlankLine && !isComment) {
            if (!isBlockCommentStart && trimmedLine !== "" && !(braceDepth === 0 && isJustClosingBraces)) {
                lastNonBlankLineWasDeclarationEnd = isDeclarationStart;
            }
        }
        braceDepth += openBraces - closeBraces;
        if (braceDepth < 0) {
            braceDepth = 0;
        }
    }
    return result.join("\n");
}
function createTransformer(classConfig, reactConfig) {
    return (context) => {
        return (sourceFile) => {
            function visit(node) {
                if (ts.isClassDeclaration(node)) {
                    if ((0, react_1.isReactComponent)(node)) {
                        if (reactConfig) {
                            return (0, react_1.transformReactComponent)(node, sourceFile, reactConfig);
                        }
                    }
                    else if (classConfig) {
                        return (0, class_1.transformClass)(node, sourceFile, classConfig);
                    }
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(sourceFile, visit);
        };
    };
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
function sortFileInternal(filePath, classConfig, reactConfig, fileConfig, dryRun = false) {
    const sourceCode = fs_1.default.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let transformedSourceFile = sourceFile;
    if (fileConfig) {
        transformedSourceFile = (0, file_1.transformFile)(sourceFile, fileConfig);
    }
    if (hasClassDeclarations(sourceFile) && (classConfig || reactConfig)) {
        const result = ts.transform(transformedSourceFile, [createTransformer(classConfig, reactConfig)]);
        transformedSourceFile = result.transformed[0];
        result.dispose();
    }
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
    });
    let output = printer.printFile(transformedSourceFile);
    output = addBlankLinesBetweenDeclarations(output);
    output = addBlankLinesBeforeReturns(output);
    if (output !== sourceCode && !dryRun) {
        fs_1.default.writeFileSync(filePath, output, "utf8");
        console.log(`✨ Sorted declarations in: ${filePath}`);
    }
    return output;
}
function sortClassMembersInDirectory(targetDir, config = {}) {
    const glob = require("glob");
    let classConfig;
    let reactConfig;
    let fileConfig;
    let dryRun;
    let include;
    let exclude;
    if ("classConfig" in config || "reactConfig" in config || "fileConfig" in config) {
        const newConfig = config;
        classConfig = newConfig.classConfig;
        reactConfig = newConfig.reactConfig;
        fileConfig = newConfig.fileConfig;
        dryRun = newConfig.dryRun || false;
        include = newConfig.include || ["**/*.{ts,tsx}"];
        exclude = newConfig.exclude || [];
    }
    else {
        const oldConfig = config;
        classConfig = oldConfig;
        reactConfig = oldConfig;
        fileConfig = undefined;
        dryRun = oldConfig.dryRun || false;
        include = ["**/*.{ts,tsx,js,jsx}"];
        exclude = [];
    }
    const criticalExcludes = ["node_modules/**", "dist/**", "build/**", "vendor/**", "bin/**"];
    const finalExclude = [...new Set([...exclude, ...criticalExcludes])];
    const files = include.flatMap(pattern => glob.sync(pattern, {
        cwd: targetDir,
        ignore: finalExclude,
        absolute: true,
    }));
    console.info(`Sorting class members in ${files.length} files...`);
    for (const file of files) {
        try {
            sortFileInternal(file, classConfig, reactConfig, fileConfig, dryRun);
        }
        catch (error) {
            console.error(`Error sorting file ${file}:`, error.message);
        }
    }
}
function sortClassMembersInFile(filePath, config = {}) {
    return sortFileInternal(filePath, config, config, undefined, config.dryRun);
}

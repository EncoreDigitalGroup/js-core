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
exports.CONFIG_FILE_NAME = void 0;
exports.hasConfigFile = hasConfigFile;
exports.loadConfig = loadConfig;
const types_1 = require("./types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
function transpileTypeScript(code) {
    const result = ts.transpileModule(code, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2015,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
        },
    });
    return result.outputText;
}
exports.CONFIG_FILE_NAME = "core.config.ts";
function loadTypeScriptConfig(filePath) {
    try {
        const code = fs.readFileSync(filePath, "utf-8");
        const transpiled = transpileTypeScript(code);
        const module = { exports: {} };
        const exports = module.exports;
        const requireFunc = (moduleName) => {
            if (moduleName.startsWith(".")) {
                const resolvedPath = path.resolve(path.dirname(filePath), moduleName);
                return require(resolvedPath);
            }
            return require(moduleName);
        };
        const func = new Function("exports", "module", "require", "__filename", "__dirname", transpiled);
        func(exports, module, requireFunc, filePath, path.dirname(filePath));
        const config = module.exports.default || module.exports;
        if (typeof config !== "object" || config === null) {
            throw new Error(`${exports.CONFIG_FILE_NAME} must export a configuration object. Found: ${typeof config}`);
        }
        return config;
    }
    catch (error) {
        throw new Error(`Failed to load ${exports.CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function hasConfigFile(projectRoot = process.cwd()) {
    const configPath = path.join(projectRoot, exports.CONFIG_FILE_NAME);
    return fs.existsSync(configPath);
}
function loadConfig(projectRoot = process.cwd()) {
    const configPath = path.join(projectRoot, exports.CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
        return types_1.defaultConfig;
    }
    try {
        const userConfig = loadTypeScriptConfig(configPath);
        return (0, types_1.mergeConfig)(userConfig);
    }
    catch (error) {
        console.error(`Error loading configuration from ${configPath}:`);
        console.error(error instanceof Error ? error.message : String(error));
        console.error("Falling back to default configuration.");
        return types_1.defaultConfig;
    }
}

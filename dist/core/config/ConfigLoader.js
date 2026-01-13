"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const ConfigDefaults = require("./ConfigDefaults.js");
const ConfigMerger = require("./ConfigMerger.js");
const ConfigValidator = require("./ConfigValidator.js");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const ts__namespace = /* @__PURE__ */ _interopNamespaceDefault(ts);
class ConfigLoader {
  static {
    this.CONFIG_FILE_NAME = "tsfmt.config.ts";
  }
  static {
    this.configCache = /* @__PURE__ */ new Map();
  }
  /** Clears the configuration cache */
  static clearCache() {
    this.configCache.clear();
  }
  /**
  * Gets the path to the config file
  * @param projectRoot - The root directory of the project
  * @returns Full path to the config file
  */
  static getConfigFilePath(projectRoot = process.cwd()) {
    return path__namespace.join(projectRoot, this.CONFIG_FILE_NAME);
  }
  /**
  * Creates a sample configuration file
  * @param projectRoot - The root directory of the project
  * @param overwrite - Whether to overwrite existing file (default: false)
  * @throws Error if file exists and overwrite is false
  */
  static createSampleConfig(projectRoot = process.cwd(), overwrite = false) {
    const configPath = this.getConfigFilePath(projectRoot);
    if (fs__namespace.existsSync(configPath) && !overwrite) {
      throw new Error(`Configuration file already exists at ${configPath}. Use overwrite=true to replace it.`);
    }
    const sampleConfig = `/*
* tsfmt Configuration File
*
* This file defines the configuration for tsfmt formatting.
* All options are optional - defaults will be used for missing values.
*/

import { CoreConfig } from "tsfmt";

const config: CoreConfig = {
    // Enable/disable index file generation
    indexGeneration: {
        enabled: true,
        directories: ConfigDefaults.getDefaultIndexDirectories(),
        updateMainIndex: true,
    },

    // Code style configuration
    codeStyle: {
        enabled: true,
        quoteStyle: "double",
        semicolons: "always",
        indentWidth: 4,
        lineWidth: 120,
    },

    // Import organization
    imports: {
        enabled: true,
        sortImports: true,
        removeUnused: true,
        groupImports: true,
    },

    // AST-based sorting
    sorting: {
        enabled: true,
        classMembers: { enabled: true },
        fileDeclarations: { enabled: true },
    },

    // Spacing rules
    spacing: {
        enabled: false,
        betweenDeclarations: true,
        beforeReturns: true,
    },

    // JSON file sorting
    packageJson: { enabled: true },
    tsConfig: { enabled: true },
};

export default config;
`;
    fs__namespace.writeFileSync(configPath, sampleConfig, "utf-8");
  }
  /**
  * Gets cache statistics for debugging
  * @returns Object with cache information
  */
  static getCacheStats() {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }
  /**
  * Gets file modification time for cache invalidation
  * @param filePath - Path to the file
  * @returns File modification time in milliseconds
  */
  static getFileModTime(filePath) {
    try {
      return fs__namespace.statSync(filePath).mtime.getTime();
    } catch {
      return 0;
    }
  }
  /**
  * Checks if a tsfmt.config.ts file exists in the project
  * @param projectRoot - The root directory of the project (defaults to current working directory)
  * @returns true if tsfmt.config.ts exists
  */
  static hasConfigFile(projectRoot = process.cwd()) {
    const configPath = path__namespace.join(projectRoot, this.CONFIG_FILE_NAME);
    return fs__namespace.existsSync(configPath);
  }
  /**
  * Transpiles TypeScript code to JavaScript
  * @param code - TypeScript code to transpile
  * @returns Transpiled JavaScript code
  */
  static transpileTypeScript(code) {
    const result = ts__namespace.transpileModule(code, {
      compilerOptions: {
        module: ts__namespace.ModuleKind.CommonJS,
        target: ts__namespace.ScriptTarget.ES2015,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    });
    return result.outputText;
  }
  /**
  * Loads and evaluates a TypeScript config file
  * @param filePath - Path to the config file
  * @returns Partial configuration from the file
  * @throws Error if the config file is invalid
  */
  static loadTypeScriptConfig(filePath) {
    try {
      const code = fs__namespace.readFileSync(filePath, "utf-8");
      const transpiled = this.transpileTypeScript(code);
      const module2 = { exports: {} };
      const exports$1 = module2.exports;
      const requireFunc = (moduleName) => {
        if (moduleName.startsWith(".")) {
          const resolvedPath = path__namespace.resolve(path__namespace.dirname(filePath), moduleName);
          return require(resolvedPath);
        }
        return require(moduleName);
      };
      const func = new Function("exports", "module", "require", "__filename", "__dirname", transpiled);
      func(exports$1, module2, requireFunc, filePath, path__namespace.dirname(filePath));
      const config = module2.exports.default || module2.exports;
      if (typeof config !== "object" || config === null) {
        throw new Error(`${this.CONFIG_FILE_NAME} must export a configuration object. Found: ${typeof config}`);
      }
      return config;
    } catch (error) {
      throw new Error(`Failed to load ${this.CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
  * Loads the configuration from cache if valid, otherwise from file
  * @param filePath - Path to the config file
  * @returns Loaded configuration
  */
  static loadConfigWithCache(filePath) {
    const currentMtime = this.getFileModTime(filePath);
    const cached = this.configCache.get(filePath);
    if (cached && cached.mtime === currentMtime) {
      return cached.config;
    }
    const config = this.loadTypeScriptConfig(filePath);
    this.configCache.set(filePath, { config, mtime: currentMtime });
    return config;
  }
  /**
  * Loads the configuration from tsfmt.config.ts if it exists, otherwise returns default config
  * @param projectRoot - The root directory of the project (defaults to current working directory)
  * @param validate - Whether to validate the configuration (default: true)
  * @returns The merged configuration
  */
  static loadConfig(projectRoot = process.cwd(), validate = true) {
    const configPath = this.getConfigFilePath(projectRoot);
    if (!fs__namespace.existsSync(configPath)) {
      return ConfigDefaults.ConfigDefaults.getDefaultConfig();
    }
    try {
      const userConfig = this.loadConfigWithCache(configPath);
      const mergedConfig = ConfigMerger.ConfigMerger.merge(userConfig);
      if (validate) {
        ConfigValidator.ConfigValidator.validateOrThrow(mergedConfig);
      }
      return mergedConfig;
    } catch (error) {
      console.error(`Error loading configuration from ${configPath}:`);
      console.error(error instanceof Error ? error.message : String(error));
      console.error("Falling back to default configuration.");
      return ConfigDefaults.ConfigDefaults.getDefaultConfig();
    }
  }
  /**
  * Loads configuration without validation (for debugging or inspection)
  * @param projectRoot - The root directory of the project
  * @returns The merged configuration without validation
  */
  static loadConfigWithoutValidation(projectRoot = process.cwd()) {
    return this.loadConfig(projectRoot, false);
  }
  /**
  * Reloads configuration by clearing cache and loading fresh
  * @param projectRoot - The root directory of the project
  * @returns The reloaded configuration
  */
  static reloadConfig(projectRoot = process.cwd()) {
    const configPath = this.getConfigFilePath(projectRoot);
    this.configCache.delete(configPath);
    return this.loadConfig(projectRoot);
  }
}
exports.ConfigLoader = ConfigLoader;

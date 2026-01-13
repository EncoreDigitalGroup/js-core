"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const BaseFormattingRule = require("../../BaseFormattingRule.js");
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
class IndexGenerationRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.defaultOptions = {
      fileExtension: ".ts",
      indexFileName: "index.ts",
      recursive: true
    };
    this.name = "IndexGenerationRule";
  }
  findProjectRoot(filePath) {
    let current = path__namespace.dirname(filePath);
    while (current !== path__namespace.dirname(current)) {
      if (fs__namespace.existsSync(path__namespace.join(current, "package.json"))) {
        return current;
      }
      current = path__namespace.dirname(current);
    }
    return null;
  }
  isTestDirectory(dirName) {
    const testDirectories = [
      "__tests__",
      "tests",
      "test",
      "__mocks__",
      "__fixtures__",
      ".storybook"
    ];
    return testDirectories.includes(dirName.toLowerCase()) || dirName.endsWith(".test") || dirName.endsWith(".spec");
  }
  isTestFile(fileName) {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      /__tests__/,
      /\.stories\.(ts|tsx|js|jsx)$/
    ];
    return testPatterns.some((pattern) => pattern.test(fileName));
  }
  generateSingleDirectoryIndex(dir, options) {
    try {
      const entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
      const exports$1 = [];
      for (const entry of entries) {
        if (entry.name === options.indexFileName) {
          continue;
        }
        if (entry.isDirectory()) {
          if (this.isTestDirectory(entry.name)) {
            continue;
          }
          const subIndexPath = path__namespace.join(dir, entry.name, options.indexFileName);
          if (fs__namespace.existsSync(subIndexPath)) {
            exports$1.push(`export * from "./${entry.name}";`);
          }
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          if (entry.name.endsWith(".d.ts")) {
            continue;
          }
          if (this.isTestFile(entry.name)) {
            continue;
          }
          const exportName = entry.name.replace(/\.(ts|tsx)$/, "");
          exports$1.push(`export * from "./${exportName}";`);
        }
      }
      if (exports$1.length === 0) {
        return;
      }
      exports$1.sort();
      const content = `// Auto-generated exports - do not edit manually
// Run tsfmt to regenerate

${exports$1.join("\n")}
`;
      const indexPath = path__namespace.join(dir, options.indexFileName);
      fs__namespace.writeFileSync(indexPath, content, "utf8");
    } catch (error) {
      console.warn(`Warning: Failed to generate index for ${dir}: ${error.message}`);
    }
  }
  generateIndexExportRecursive(dir, options) {
    try {
      const entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (this.isTestDirectory(entry.name)) {
            continue;
          }
          const subDir = path__namespace.join(dir, entry.name);
          this.generateIndexExportRecursive(subDir, options);
        }
      }
      this.generateSingleDirectoryIndex(dir, options);
    } catch (error) {
      console.warn(`Warning: Failed to process directory ${dir}: ${error.message}`);
    }
  }
  generateIndexExport(dir, options) {
    if (!fs__namespace.existsSync(dir)) {
      return;
    }
    if (options.recursive) {
      this.generateIndexExportRecursive(dir, options);
    } else {
      this.generateSingleDirectoryIndex(dir, options);
    }
  }
  discoverExportableModules(srcDir) {
    try {
      const entries = fs__namespace.readdirSync(srcDir, { withFileTypes: true });
      const modules = [];
      for (const entry of entries) {
        if (entry.name === "index.ts") {
          continue;
        }
        if (entry.isDirectory()) {
          if (this.isTestDirectory(entry.name)) {
            continue;
          }
          const indexPath = path__namespace.join(srcDir, entry.name, "index.ts");
          if (fs__namespace.existsSync(indexPath)) {
            modules.push(entry.name);
          }
        } else if (entry.name.endsWith(".d.ts")) {
          const moduleName = entry.name.slice(0, -3);
          modules.push(moduleName);
        }
      }
      return modules.sort();
    } catch (error) {
      console.warn(`Warning: Failed to discover modules in ${srcDir}: ${error.message}`);
      return [];
    }
  }
  updateMainIndex(indexPath, modules) {
    try {
      const exports$1 = modules.map((mod) => `export * from "./${mod}";`).join("\n");
      const content = `// Auto-generated exports - do not edit manually
// Run tsfmt to regenerate

${exports$1}
`;
      fs__namespace.writeFileSync(indexPath, content, "utf8");
    } catch (error) {
      console.warn(`Warning: Failed to write main index file: ${error.message}`);
    }
  }
  generateIndexFiles(currentFilePath) {
    try {
      const projectRoot = this.findProjectRoot(currentFilePath);
      if (!projectRoot) {
        return;
      }
      const config = this.getIndexGenerationConfig();
      const directories = config?.directories || [];
      const options = { ...this.defaultOptions, ...config?.options };
      for (const dir of directories) {
        const fullDirPath = path__namespace.resolve(projectRoot, dir);
        this.generateIndexExport(fullDirPath, options);
      }
      if (config?.updateMainIndex !== false) {
        const srcDir = path__namespace.join(projectRoot, "src");
        const mainIndexPath = path__namespace.join(srcDir, "index.ts");
        if (fs__namespace.existsSync(srcDir)) {
          const modules = this.discoverExportableModules(srcDir);
          this.updateMainIndex(mainIndexPath, modules);
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to generate index files: ${error.message}`);
    }
  }
  apply(source, filePath) {
    const config = this.getIndexGenerationConfig();
    if (!config?.enabled || !filePath) {
      return source;
    }
    this.generateIndexFiles(filePath);
    return source;
  }
}
exports.IndexGenerationRule = IndexGenerationRule;

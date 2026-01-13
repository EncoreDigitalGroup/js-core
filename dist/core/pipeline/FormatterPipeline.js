"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs/promises");
const path = require("path");
require("../config/ConfigDefaults.js");
require("../config/ConfigLoader.js");
const ConfigTypes = require("../config/ConfigTypes.js");
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
class FormatterError extends Error {
  constructor(formatterName, filePath, originalError) {
    super(`Formatter '${formatterName}' failed for file '${filePath}': ${originalError.message}`);
    this.formatterName = formatterName;
    this.filePath = filePath;
    this.originalError = originalError;
    this.name = "FormatterError";
  }
}
class FormatterPipeline {
  constructor(config, container) {
    this.config = config;
    this.container = container;
    this.rules = /* @__PURE__ */ new Map();
    this.formatterOrder = config.formatterOrder || [
      ConfigTypes.FormatterOrder.IndexGeneration,
      ConfigTypes.FormatterOrder.CodeStyle,
      ConfigTypes.FormatterOrder.ImportOrganization,
      ConfigTypes.FormatterOrder.ASTTransformation,
      ConfigTypes.FormatterOrder.Spacing
    ];
    this.initializeRules();
  }
  /** Extract type name from call stack by reading source code */
  extractTypeNameFromStack() {
    const stack = new Error().stack;
    if (!stack) {
      throw new Error("Cannot determine type name from stack");
    }
    const lines = stack.split("\n");
    for (const line of lines) {
      if (line.includes("FormatterPipeline.extractTypeNameFromStack") || line.includes("FormatterPipeline.addRule")) {
        continue;
      }
      const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        const [, filePath, lineNum] = match;
        try {
          const fs2 = require("fs");
          const sourceCode = fs2.readFileSync(filePath, "utf8");
          const sourceLines = sourceCode.split("\n");
          const callLine = sourceLines[parseInt(lineNum) - 1];
          const typeMatch = callLine.match(/\.addRule<([^>]+)>/);
          if (typeMatch && typeMatch[1]) {
            return typeMatch[1].trim();
          }
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error("Cannot extract type name from addRule call. Use format: addRule<RuleName>(order)");
  }
  /** Add a rule to the pipeline at a specific order position using magical syntax */
  addRule(order) {
    if (!this.rules.has(order)) {
      this.rules.set(order, []);
    }
    const typeName = this.extractTypeNameFromStack();
    const ruleInstance = this.container.resolve(typeName);
    this.rules.get(order).push(ruleInstance);
  }
  /** Add a rule to the pipeline by explicit name - used by Vite build transformation */
  // @ts-ignore - This method is called after Vite build transformation replaces addRule<T>() calls
  addRuleByName(ruleName, order) {
    if (!this.rules.has(order)) {
      this.rules.set(order, []);
    }
    const ruleInstance = this.container.resolve(ruleName);
    this.rules.get(order).push(ruleInstance);
  }
  /** Get all files in a directory recursively */
  async getFilesRecursively(dirPath, extensions) {
    const files = [];
    const entries = await fs__namespace.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path__namespace.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build"].includes(entry.name)) {
          continue;
        }
        const subFiles = await this.getFilesRecursively(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }
  /**
  * Format a file using the configured formatters in sequence
  * @param filePath - Absolute path to the file to format
  * @param dryRun - If true, don't write changes to disk
  * @returns Pipeline context with execution details
  * @throws FormatterError if any formatter fails (fail-fast)
  */
  async formatFile(filePath, dryRun = false) {
    const originalSource = await fs__namespace.readFile(filePath, "utf-8");
    const context = {
      filePath,
      originalSource,
      currentSource: originalSource,
      executions: [],
      changed: false,
      dryRun
    };
    for (const order of this.formatterOrder) {
      const rulesAtOrder = this.rules.get(order);
      if (!rulesAtOrder || rulesAtOrder.length === 0) {
        continue;
      }
      for (const rule of rulesAtOrder) {
        const execution = {
          formatterName: rule.name,
          order,
          changed: false
        };
        try {
          const beforeSource = context.currentSource;
          const afterSource = rule.apply(context.currentSource, filePath);
          execution.changed = beforeSource !== afterSource;
          context.currentSource = afterSource;
          if (execution.changed) {
            context.changed = true;
          }
          context.executions.push(execution);
        } catch (error) {
          execution.error = error;
          context.executions.push(execution);
          throw new FormatterError(rule.name, filePath, error);
        }
      }
    }
    if (context.changed && !dryRun) {
      await fs__namespace.writeFile(filePath, context.currentSource, "utf-8");
    }
    return context;
  }
  /**
  * Format multiple files in sequence
  * @param filePaths - Array of file paths to format
  * @param dryRun - If true, don't write changes to disk
  * @returns Array of pipeline contexts for each file
  * @throws FormatterError if any formatter fails for any file
  */
  async formatFiles(filePaths, dryRun = false) {
    const results = [];
    for (const filePath of filePaths) {
      const context = await this.formatFile(filePath, dryRun);
      results.push(context);
    }
    return results;
  }
  /**
  * Format all files in a directory recursively
  * @param dirPath - Directory path to format
  * @param dryRun - If true, don't write changes to disk
  * @param extensions - File extensions to include (default: .ts, .tsx, .js, .jsx)
  * @returns Array of pipeline contexts for each file
  */
  async formatDirectory(dirPath, dryRun = false, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
    const files = await this.getFilesRecursively(dirPath, extensions);
    return this.formatFiles(files, dryRun);
  }
  /** Get the list of formatters in execution order */
  getFormatterOrder() {
    return [...this.formatterOrder];
  }
  /** Get all rules at a specific order position */
  getRulesAtOrder(order) {
    return this.rules.get(order) || [];
  }
  /** Check if any rules are configured */
  hasRules() {
    return this.rules.size > 0;
  }
  /** Initialize rules based on configuration using clean DI pattern */
  initializeRules() {
    if (this.config.indexGeneration?.enabled) {
      this.addRuleByName("IndexGenerationRule", ConfigTypes.FormatterOrder.IndexGeneration);
    }
    if (this.config.codeStyle?.enabled) {
      this.addRuleByName("QuoteStyleRule", ConfigTypes.FormatterOrder.CodeStyle);
      this.addRuleByName("SemicolonRule", ConfigTypes.FormatterOrder.CodeStyle);
      this.addRuleByName("BracketSpacingRule", ConfigTypes.FormatterOrder.CodeStyle);
      this.addRuleByName("IndentationRule", ConfigTypes.FormatterOrder.CodeStyle);
      this.addRuleByName("BlockSpacingRule", ConfigTypes.FormatterOrder.CodeStyle);
      this.addRuleByName("DocBlockCommentRule", ConfigTypes.FormatterOrder.CodeStyle);
    }
    if (this.config.imports?.enabled) {
      this.addRuleByName("ImportOrganizationRule", ConfigTypes.FormatterOrder.ImportOrganization);
    }
    if (this.config.sorting?.enabled) {
      if (this.config.sorting.classMembers?.enabled) {
        this.addRuleByName("ClassMemberSortingRule", ConfigTypes.FormatterOrder.ASTTransformation);
      }
      if (this.config.sorting.fileDeclarations?.enabled) {
        this.addRuleByName("FileDeclarationSortingRule", ConfigTypes.FormatterOrder.ASTTransformation);
      }
    }
    if (this.config.spacing?.enabled) {
      this.addRuleByName("BlankLineBetweenDeclarationsRule", ConfigTypes.FormatterOrder.Spacing);
      this.addRuleByName("BlankLineBetweenStatementTypesRule", ConfigTypes.FormatterOrder.Spacing);
      this.addRuleByName("BlankLineBeforeReturnsRule", ConfigTypes.FormatterOrder.Spacing);
    }
  }
}
exports.FormatterError = FormatterError;
exports.FormatterPipeline = FormatterPipeline;

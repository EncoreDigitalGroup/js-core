"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("typescript");
require("./ConfigLoader.js");
const ConfigTypes = require("./ConfigTypes.js");
require("reflect-metadata");
const ClassMemberSortingRule = require("../formatters/rules/ast/ClassMemberSortingRule.js");
const FileDeclarationSortingRule = require("../formatters/rules/ast/FileDeclarationSortingRule.js");
require("fs");
require("path");
require("fs/promises");
const types = require("../../shared/types.js");
class ConfigDefaults {
  static {
    this.DEFAULT_EXCLUDE_PATTERNS = ["node_modules/**", "dist/**", "vendor/**", "bin/**"];
  }
  static {
    this.DEFAULT_INDEX_DIRECTORIES = ["src/", "packages/"];
  }
  static {
    this.DEFAULT_JS_INCLUDE_PATTERNS = ["**/*.{js,ts,jsx,tsx}"];
  }
  static {
    this.DEFAULT_TS_INCLUDE_PATTERNS = ["**/*.{ts,tsx}"];
  }
  /** Get default code style configuration */
  static getDefaultCodeStyleConfig() {
    return {
      enabled: true,
      quoteStyle: "double",
      semicolons: "always",
      bracketSpacing: false,
      indentStyle: "space",
      indentWidth: 4,
      lineWidth: 120,
      trailingCommas: "all",
      arrowParens: "avoid"
    };
  }
  /** Get default directories for index generation */
  static getDefaultIndexDirectories() {
    return [...this.DEFAULT_INDEX_DIRECTORIES];
  }
  /** Get default index generation configuration */
  static getDefaultIndexGenerationConfig() {
    return {
      enabled: true,
      directories: this.getDefaultIndexDirectories(),
      options: {
        fileExtension: ".ts",
        indexFileName: "index.ts",
        recursive: true
      },
      updateMainIndex: true
    };
  }
  /** Get default import configuration */
  static getDefaultImportConfig() {
    return {
      enabled: true,
      sortImports: true,
      removeUnused: true,
      removeSideEffects: false,
      groupImports: true,
      groupOrder: ConfigTypes.ConfigTypes.getImportGroupOptions(),
      separateGroups: false
    };
  }
  /** Get default include patterns for TypeScript files */
  static getDefaultIncludePatterns() {
    return [...this.DEFAULT_TS_INCLUDE_PATTERNS];
  }
  /** Get default exclude patterns for file processing */
  static getDefaultExcludePatterns() {
    return [...this.DEFAULT_EXCLUDE_PATTERNS];
  }
  /** Get default sorting configuration */
  static getDefaultSortingConfig() {
    return {
      enabled: true,
      classMembers: {
        enabled: true,
        order: ClassMemberSortingRule.DEFAULT_CLASS_ORDER,
        groupByVisibility: false,
        respectDependencies: true
      },
      reactComponents: {
        enabled: true,
        order: ClassMemberSortingRule.DEFAULT_CLASS_ORDER,
        groupByVisibility: false,
        respectDependencies: true
      },
      fileDeclarations: {
        enabled: true,
        order: FileDeclarationSortingRule.DEFAULT_FILE_ORDER,
        respectDependencies: true
      },
      include: this.getDefaultIncludePatterns(),
      exclude: this.getDefaultExcludePatterns()
    };
  }
  /** Get default spacing configuration */
  static getDefaultSpacingConfig() {
    return {
      enabled: false,
      betweenDeclarations: true,
      beforeReturns: true,
      betweenStatementTypes: true
    };
  }
  /** Get default package.json configuration */
  static getDefaultPackageJsonConfig() {
    return {
      enabled: true,
      customSortOrder: types.DefaultSortOptions.customSortOrder,
      indentation: 4
    };
  }
  /** Get default tsconfig.json configuration */
  static getDefaultTsConfigConfig() {
    return {
      enabled: true,
      indentation: 4
    };
  }
  /** Get default formatter order */
  static getDefaultFormatterOrder() {
    return [
      ConfigTypes.FormatterOrder.IndexGeneration,
      ConfigTypes.FormatterOrder.CodeStyle,
      ConfigTypes.FormatterOrder.ImportOrganization,
      ConfigTypes.FormatterOrder.ASTTransformation,
      ConfigTypes.FormatterOrder.Spacing
    ];
  }
  /** Get the complete default configuration */
  static getDefaultConfig() {
    return {
      indexGeneration: this.getDefaultIndexGenerationConfig(),
      codeStyle: this.getDefaultCodeStyleConfig(),
      imports: this.getDefaultImportConfig(),
      sorting: this.getDefaultSortingConfig(),
      spacing: this.getDefaultSpacingConfig(),
      packageJson: this.getDefaultPackageJsonConfig(),
      tsConfig: this.getDefaultTsConfigConfig(),
      formatterOrder: this.getDefaultFormatterOrder()
    };
  }
  /** Get default include patterns for JavaScript files */
  static getDefaultJavaScriptIncludePatterns() {
    return [...this.DEFAULT_JS_INCLUDE_PATTERNS];
  }
  /** Create a configuration with all features disabled */
  static getDisabledConfig() {
    return {
      indexGeneration: { enabled: false },
      codeStyle: { enabled: false },
      imports: { enabled: false },
      sorting: { enabled: false },
      spacing: { enabled: false },
      packageJson: { enabled: false },
      tsConfig: { enabled: false }
    };
  }
  /** Create a minimal configuration with only enabled features */
  static getMinimalConfig() {
    return {
      indexGeneration: { enabled: true },
      codeStyle: { enabled: true },
      imports: { enabled: true },
      sorting: { enabled: true },
      spacing: { enabled: false },
      packageJson: { enabled: true },
      tsConfig: { enabled: true }
    };
  }
}
exports.ConfigDefaults = ConfigDefaults;

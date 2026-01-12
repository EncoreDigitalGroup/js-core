# tsfmt

**Opinionated TypeScript and JavaScript code formatter with AST-based transformations**

An advanced code formatting tool that goes beyond traditional pretty-printing to enforce structural consistency across TypeScript and JavaScript codebases. Built by
Encore Digital Group, tsfmt combines configurable formatting rules with intelligent AST analysis to automatically organize imports, sort class members, arrange file
declarations, and apply consistent code style patterns.

## What tsfmt Does

tsfmt is a comprehensive code formatter that operates on multiple levels:

**AST-Based Sorting & Organization**

- Intelligently sorts class members (properties, constructors, methods, accessors) with dependency awareness
- Organizes file-level declarations (interfaces, types, enums, functions, classes) in logical order
- Handles React component lifecycle methods with specialized sorting rules
- Respects code dependencies to prevent breaking changes during reorganization

**Import Management**

- Automatically organizes and groups imports (external, internal, relative)
- Removes unused imports while preserving side-effect imports
- Sorts import statements alphabetically within groups
- Configurable import grouping and separation

**Code Style Formatting**

- Enforces consistent quote styles, semicolon usage, and bracket spacing
- Manages indentation (spaces vs tabs) and line width constraints
- Controls trailing comma placement and arrow function parentheses
- Applies spacing rules for blank lines between declarations and before returns

**Configuration File Formatting**

- Sorts `package.json` fields according to company standards
- Alphabetically sorts all keys in `tsconfig.json` files
- Maintains consistent JSON indentation and structure

## Core Formatting Opinions

tsfmt enforces these opinionated defaults designed for enterprise-grade codebases:

**Code Style Standards**

- Double quotes for all string literals
- Semicolons always required
- No bracket spacing in object literals (`{key: value}` not `{ key: value }`)
- 4-space indentation (no tabs)
- 120-character line width limit
- Trailing commas everywhere possible
- Arrow function parentheses omitted when possible (`x => x` not `(x) => x`)

**Structural Organization**

- Class members ordered by type: static properties, instance properties, constructor, accessors, static methods, instance methods
- File declarations ordered by importance: interfaces, types, enums, helper functions, exported functions, classes, default exports
- Import groups separated by origin: external packages, internal modules, relative imports
- Blank lines enforced between different declaration types and before return statements

**Package & Config Files**

- `package.json` fields ordered by company standard: name, type, author, version, description, publishConfig, keywords, homepage, engines, dependencies, devDependencies,
  scripts, types, main, module, exports, files, repository, bugs
- `tsconfig.json` keys sorted alphabetically at all nesting levels
- Consistent 4-space JSON indentation throughout

## Architecture

tsfmt uses a sophisticated pipeline-based architecture:

**Formatter Pipeline**

- Executes formatters in a specific order: CodeStyle → ImportOrganization → ASTTransformation → Spacing
- Each formatter can be independently enabled/disabled
- Pipeline maintains context and tracks changes across transformations

**AST Analysis Engine**

- Built on TypeScript compiler API for accurate parsing
- Dependency resolution prevents breaking member/declaration relationships
- Handles complex scenarios like method dependencies and forward references

**Configuration System**

- Zero-configuration by default with sensible opinions
- Optional `core.config.ts` file for project-specific customization
- Deep merging of user configuration with defaults

## Key Features

- **Dependency-Aware Sorting**: Analyzes code relationships to prevent breaking changes during reorganization
- **React-Specific Rules**: Specialized handling for React component lifecycle methods and patterns
- **Configurable Pipeline**: Modular formatter system allows granular control over formatting operations
- **Incremental Processing**: Only modifies files that need changes, preserving unchanged content
- **TypeScript-Native**: Built on TypeScript compiler API for maximum compatibility and accuracy
- **Enterprise-Ready**: Designed for large codebases with consistent, non-negotiable formatting standards

## Philosophy

tsfmt is built on the principle that code formatting should not just make code look consistent, but should also impose logical structure that improves maintainability. By
combining traditional pretty-printing with intelligent AST transformations, tsfmt ensures that codebases follow not just visual consistency, but also structural patterns
that make code easier to navigate, understand, and modify.

The tool is intentionally opinionated to eliminate formatting debates and establish company-wide standards that prioritize readability, consistency, and maintainability
over individual preferences.
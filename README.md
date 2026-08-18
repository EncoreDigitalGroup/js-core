# tsfmt

**Opinionated TypeScript and JavaScript code formatter with AST-based transformations**

An advanced code formatting tool that goes beyond traditional pretty-printing to enforce structural consistency across TypeScript and JavaScript codebases. Built by
Encore Digital Group, tsfmt combines configurable formatting rules with intelligent AST analysis to automatically organize imports, sort class members, arrange file
declarations, and apply consistent code style patterns.

## Install

```bash
npm install --save-dev tsfmt
```

Or run once without installing:

```bash
npx tsfmt
```

The published package is a small Node launcher. On first run it downloads a standalone binary for your platform from this project's GitLab Generic Package Registry and
caches it under `~/.cache/tsfmt/<version>/` (or `$XDG_CACHE_HOME/tsfmt/<version>/`). Bun is not required to run tsfmt. Set `TSFMT_BINARY_PATH` to use a local binary
instead.

Supported platforms: macOS (arm64, x64), Linux glibc and musl (x64, arm64), Windows (x64, arm64).

## Usage

```bash
npx tsfmt
npx tsfmt --dry
npx tsfmt path/to/file.ts
npx tsfmt path/to/project
```

With no path, tsfmt formats the current working directory. A file path must be `.ts`, `.tsx`, `.js`, or `.jsx`. A directory path also sorts `package.json` and
`tsconfig.json` when those formatters are enabled. `--dry` reports what would change and writes nothing.

## Configuration

Zero-config by default. Optional `tsfmt.config.ts` in the project root (or next to a single file being formatted):

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    codeStyle: {quoteStyle: "double"},
    spacing: {enabled: true},
});
```

`tsfmt()` merges your overrides with the defaults. The npm package ships TypeScript types for this helper; it does not ship a runtime JavaScript library.

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

tsfmt uses a parse-once, ts-morph-based pipeline architecture:

**Parse-Once Pipeline**

- Each file is parsed exactly once into a shared `FormatContext`, built on `ts-morph` (a trivia-preserving
  wrapper over the TypeScript compiler API), and threaded through every rule in the pipeline
- Rules execute in a specific order — IndexGeneration → CodeStyle → ImportOrganization → ASTTransformation →
  Spacing — and every rule implements a single native `applyToContext(context)` contract that mutates the
  shared model in place; there is no per-rule string round-trip and no re-parsing between rules
- The file is emitted once, at the end of the pipeline, from the final state of the shared model
- Each formatter order can be independently enabled/disabled, and the pipeline tracks changes across all
  transformations
- `.tsx`/`.jsx` files are parsed with `ts-morph`'s `ScriptKind` derived from the real file extension, so JSX
  trivia (text, expressions) is preserved correctly instead of being corrupted by a `.ts`-only parser

**Structural-vs-Region Rule Split**

- Structural rules (sorting, import organization, quote style, and similar) operate directly on the AST —
  they query and rewrite `ts-morph` nodes, so they are inherently JSX-safe because they only ever touch
  real syntax nodes
- Region rules (whitespace/blank-line/indentation rules that work over raw text) instead consult
  `FormatContext.getProtectedRanges()` to skip character ranges that fall inside JSX text, JSX expressions,
  or template literals, so they never rewrite whitespace embedded in markup or string content
- Region rules are the only place a `replaceWithText` re-parse still happens, since they mutate text
  directly rather than AST nodes; this is an inherent property of text-level whitespace formatting, not a
  transitional bridge

**Dependency Resolution**

- Dependency resolution prevents breaking member/declaration relationships during structural sorting
- Handles complex scenarios like method dependencies and forward references

**Configuration System**

- Zero-configuration by default with sensible opinions
- Optional `tsfmt.config.ts` file for project-specific customization
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
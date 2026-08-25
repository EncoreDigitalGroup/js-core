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

```bash
bunx tsfmt
```

The published package is a small Node launcher. Installing `tsfmt` automatically pulls in the matching `@tsfmt/<platform>` binary package for your platform through npm's
`optionalDependencies` mechanism — there is no download step and no cache directory, and the tool works offline as soon as `npm install` (or `bunx`/`npx`) has completed.
Bun is not required to run tsfmt. Set `TSFMT_BINARY_PATH` to use a local binary instead.

Supported platforms: macOS (arm64, x64), Linux glibc and musl (x64, arm64), Windows (x64, arm64).

## Usage

```bash
npx tsfmt
npx tsfmt --dry
npx tsfmt --no-gate
npx tsfmt path/to/file.ts
npx tsfmt path/to/project
npx tsfmt src/a.ts src/b.ts lib/
```

With no path, tsfmt formats the current working directory, driven by the [`paths`](#configuration) config key (an empty `paths` scans the whole tree, the `tsfmt .`
behavior). You can pass one or more positional paths — files, directories, or globs — and they are formatted mixed together. Every run, whether bare or with paths,
flows through the same pipeline: the restrictions gate runs first, then `package.json`/`tsconfig.json` are sorted (when those formatters are enabled and the files exist
in the current directory), then the discovered files are formatted. A passed file must be `.ts`, `.tsx`, `.js`, or `.jsx`.

Passing paths on the command line scopes the run to exactly those paths and **bypasses** `paths.exclude` — a file named explicitly is always formatted, even if the
config would normally exclude it (the always-on critical excludes — `node_modules`, `dist`, `build`, `vendor`, `bin` — are still pruned inside a passed directory or
glob). `--dry` reports what would change and writes nothing. `--no-gate` skips the restrictions gate (see [Restrictions](#restrictions) below) and formats normally even
if a `restrictions.imports` rule would otherwise be violated.

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

### `paths` — which files a run formats

`paths` is the single source of truth for file discovery, so `tsfmt` can be invoked with no arguments in scripts and CI:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    paths: {
        include: [],
        exclude: [],
    },
});
```

- **`paths.include`** — glob patterns of files to format. Default `[]`. When empty, a bare run scans the whole current-directory tree (the `tsfmt .` behavior). When
  non-empty, its matches are **added back on top** of the scanned set, so an included file overrides `paths.exclude`. Positional CLI paths replace this array for the run.
- **`paths.exclude`** — glob patterns to skip on a bare, config-driven run. Default `[]`. Applied on top of the always-on critical excludes (`node_modules`, `dist`,
  `build`, `vendor`, `bin`). It is overridden by `paths.include` and bypassed entirely when paths are passed on the command line.

`paths` is loaded once per invocation from the config file in the current working directory; it is not hot-reloadable.

> **Migration from `sorting.include`/`sorting.exclude`:** these keys have been removed. Move any globs you set there to `paths.include`/`paths.exclude` — they were the
> file-discovery mechanism and `paths` replaces them directly. They never scoped the AST sorting rules themselves.

### `preset` — built-in presets

Set `preset` to load a named bundle of config values beneath your own overrides. A preset is layered **between the built-in defaults and your config**, so its values
replace the defaults, but any key you set yourself still wins:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    preset: "laravel",
    // your own overrides go here and take precedence over the preset
});
```

The merge order is **defaults → preset → your config**. The `laravel` preset currently sets:

- `codeStyle.quoteStyle: "single"` (tsfmt's default is `"double"`)

Everything the preset does not set falls through to the tsfmt defaults. An unknown preset name is an error — tsfmt prints it and falls back to the default config for that
run. The `preset` key is typed as a union of the known preset names, so a mistyped name is also flagged in your editor.

**Adding a preset:** presets live in `src/core/config/presets/`. Add a file exporting a `Partial<CoreConfig>` with only the values that differ from the defaults, then add
one entry to the `PRESETS` map in `src/core/config/presets/index.ts`. The `preset` key's type and editor autocomplete update automatically.

## Restrictions

tsfmt is also able to enforce *architectural* rules about what code may import what — for example, "this directory may not import that one" — through an optional
`restrictions` config key. Restrictions are a separate, read-only domain from formatting: a **gate** runs across the target files before any formatting starts, and if
a `forbid`-list or `allow`-list rule is violated, tsfmt prints each violation and exits non-zero **without formatting any file** — this holds even under `--dry`.

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["app_modules/UIKit/resources/**/*.{ts,tsx}"],
                forbid: [
                    {pattern: "@/**", message: "UIKit may not import internal app modules directly."},
                    {pattern: ["app_modules/Other/**", "**/app_modules/Other/**"], message: "No cross-module imports."},
                ],
            },
        ],
    },
});
```

Each rule has a `files` glob list (relative to the project root, i.e. the directory `tsfmt.config.ts` lives in) and a `forbid` list of module-specifier
glob patterns paired with the message to print when an import matches. A violation is reported as:

```
src/Foo.ts:1:1  UIKit may not import internal app modules directly.  (imports "@/internal/Foo")
1 restriction violation(s). Formatting skipped — fix these first.
```

A rule can also carry an `allow` list instead of, or alongside, `forbid`: any import whose specifier matches none of the `allow` globs is a violation,
reported with the rule's `message` (or a generated `Import "<spec>" is not in the allow-list.` when `message` is omitted).

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["app_modules/UIKit/resources/**/*.{ts,tsx}"],
                allow: ["app_modules/UIKit/**", "@/ui/**"],
                message: "UIKit may only import from itself or the shared UI library.",
            },
        ],
    },
});
```

`allow` and `forbid` may be combined in the same rule — both are evaluated for every import, so a specifier can be reported as violating each independently.

The gate is opt-in — omitting `restrictions` entirely (the default) leaves tsfmt fully unaffected. It runs on every invocation, bare or with explicit paths (including a
single passed file), with `files` globs resolved relative to the current working directory. An invalid `restrictions` block (e.g. a `forbid` entry missing `message`) is
a hard failure: tsfmt prints the config error and exits non-zero rather than silently falling back to formatting. Pass `--no-gate` to skip the gate and format normally
regardless of any restriction rules.

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
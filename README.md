# tsfmt

**An opinionated formatter for TypeScript and JavaScript that organizes your code, not just your whitespace.**

tsfmt formats `.ts`, `.tsx`, `.js`, and `.jsx` files to one consistent style — quotes, semicolons, indentation, line width — and goes further than a pretty-printer. It
sorts class members, orders file-level declarations, organizes and de-duplicates imports, removes unused imports, and sorts your `package.json` and `tsconfig.json`. It
works with zero configuration and can be dropped into a script or CI job with a single command.

tsfmt is built by Encore Digital Group on top of [`ts-morph`](https://ts-morph.com/), so every change is made against a real parse of your code. Your code keeps working
after it's reformatted.

## What tsfmt does for you

- **One consistent style, no debates.** Double quotes, semicolons, 4-space indentation, a 120-character line width, and trailing commas — applied the same way in every
  file, so code review stops arguing about formatting.
- **Tidy imports, automatically.** Imports are grouped (external, internal, relative), sorted, merged when they come from the same module, and stripped when they're
  unused. Side-effect imports like `import "./styles.css"` are kept.
- **Structure, not just looks.** Class members and top-level declarations are reordered into a predictable layout, with dependency analysis so a reorder never breaks
  working code.
- **Config files, too.** `package.json` fields and `tsconfig.json` keys are sorted to a consistent order.
- **Architectural guardrails (optional).** Declare rules like "this folder may not import that one" and tsfmt blocks the run until the violations are fixed.

## Install

```bash
npm install --save-dev tsfmt
```

Or run it once without installing:

```bash
npx tsfmt
# or
bunx tsfmt
```

The published package is a small launcher. Installing `tsfmt` automatically pulls in the matching prebuilt binary for your platform through npm's
`optionalDependencies`, so there's no separate download step, no cache directory, and the tool works offline as soon as the install finishes.

Supported platforms: macOS (arm64, x64), Linux glibc and musl (x64, arm64), and Windows (x64, arm64).

To point tsfmt at a binary you built or placed yourself, set the `TSFMT_BINARY_PATH` environment variable to its full path.

## Quick start

From the root of your project:

```bash
npx tsfmt          # format the whole project
npx tsfmt --dry    # preview changes without writing anything
```

That's it — no config file needed. Add it to your `package.json` scripts to make it a one-liner for the whole team:

```json
{
    "scripts": {
        "format": "tsfmt",
        "format:check": "tsfmt --dry"
    }
}
```

## Usage

```bash
tsfmt                          # format the current project (config-driven)
tsfmt --dry                    # report what would change, write nothing
tsfmt --no-gate                # skip the restrictions gate (see below)
tsfmt path/to/file.ts          # format one file
tsfmt path/to/project          # format one directory
tsfmt src/a.ts src/b.ts lib/   # format several paths at once
```

With no path, tsfmt formats your project driven by the [`paths`](#choosing-which-files-run) config key (with no config, it scans the whole current directory tree). Every
run — bare or with paths — flows through the same pipeline in this order:

1. The restrictions gate runs first (see [Restrictions](#restrictions)).
2. `package.json` and `tsconfig.json` in the current directory are sorted, when those formatters are enabled and the files exist.
3. The discovered source files are formatted.

**Passing paths on the command line** scopes the run to exactly those paths and **bypasses** `paths.exclude` — a file you name explicitly is always formatted, even if
your config would normally skip it. The always-on critical excludes (`node_modules`, `dist`, `build`, `vendor`, `bin`) are still pruned inside any directory or glob you
pass. A file you name must be `.ts`, `.tsx`, `.js`, or `.jsx`.

**`--dry`** reports what would change and writes nothing. **`--no-gate`** skips the restrictions gate and formats normally even when a rule would otherwise block the run.
Any other flag is an error — only `--dry` and `--no-gate` are recognized.

## Configuration

tsfmt is zero-config by default. To customize it, add a `tsfmt.config.ts` file to your project root:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    codeStyle: {
        quoteStyle: "single"
    },
    imports: {
        separateGroups: true
    },
});
```

The `tsfmt()` helper merges your overrides on top of the defaults, so you only set the keys you want to change. The package ships TypeScript types for this helper, which
gives you autocomplete and type-checking in your editor. Every option below is optional.

### Choosing which files run

`paths` is the single source of truth for which files a bare `tsfmt` run formats, so it can be invoked with no arguments in scripts and CI:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    paths: {
        include: ["src/**/*.ts", "scripts/**/*.ts"],
        exclude: ["**/*.generated.ts"],
    },
});
```

- **`paths.include`** — globs of files to format. Default `[]`. When empty, a bare run scans the whole current-directory tree. When set, its matches are **added on top**
  of the scanned set, so an included file wins even if `paths.exclude` would skip it. Positional CLI paths replace this list for that run.
- **`paths.exclude`** — globs to skip on a bare, config-driven run. Default `[]`. Applied on top of the always-on critical excludes (`node_modules`, `dist`,
  `build`, `vendor`, `bin`). It's overridden by `paths.include` and ignored entirely when you pass paths on the command line.

### Presets

Set `preset` to load a named bundle of settings beneath your own overrides. The merge order is **defaults → preset → your config**, so a preset replaces the defaults but
any key you set yourself still wins:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    preset: "laravel",
    // your own overrides go here and take precedence over the preset
});
```

The `laravel` preset sets:

- `codeStyle.quoteStyle: "single"` (tsfmt's default is `"double"`)
- `paths.exclude` for generated Laravel front-end output — `public/**`, `resources/js/actions/**`, `resources/js/routes/**`, and `resources/js/wayfinder/**`

Anything a preset doesn't set falls through to the tsfmt defaults. The `preset` key is typed as a union of the known preset names, so a typo is flagged in your editor. If
an unknown name reaches tsfmt at runtime, it prints the error and falls back to the default configuration for that run.

### Option reference

Every option has a sensible default — you only set what you want to change. Defaults reflect tsfmt's [core opinions](#the-defaults-tsfmts-opinions).

**`codeStyle`** — visual style of the code itself:

| Option                | Type                           | Default    | What it does                                               |
|-----------------------|--------------------------------|------------|------------------------------------------------------------|
| `enabled`             | boolean                        | `true`     | Run code-style formatting at all                           |
| `quoteStyle`          | `"single"` \| `"double"`       | `"double"` | Quote character for string literals                        |
| `semicolons`          | `"always"` \| `"never"`        | `"always"` | Whether statements end with a semicolon                    |
| `bracketSpacing`      | boolean                        | `false`    | Spaces inside object literals — `{ a: 1 }` vs `{a: 1}`     |
| `typeBracketSpacing`  | boolean                        | `true`     | Spaces inside object type literals — `{ a: string }`       |
| `indentStyle`         | `"space"` \| `"tab"`           | `"space"`  | Indent with spaces or tabs                                 |
| `indentWidth`         | number                         | `4`        | Number of spaces per indent level                          |
| `lineWidth`           | number                         | `120`      | Maximum line width                                         |
| `trailingCommas`      | `"none"` \| `"es5"` \| `"all"` | `"all"`    | Where to add trailing commas                               |
| `arrowParens`         | `"always"` \| `"avoid"`        | `"avoid"`  | Parentheses around single arrow-function params — `x => x` |
| `jsxSelfClosingSpace` | boolean                        | `false`    | Space before the `/>` of a self-closing JSX element        |

**`imports`** — import organization:

| Option              | Type     | Default                                | What it does                                                          |
|---------------------|----------|----------------------------------------|-----------------------------------------------------------------------|
| `enabled`           | boolean  | `true`                                 | Organize imports at all                                               |
| `sortImports`       | boolean  | `true`                                 | Sort imports alphabetically within each group                         |
| `mergeDuplicates`   | boolean  | `true`                                 | Merge multiple imports from the same module into one statement        |
| `shortenPaths`      | boolean  | `true`                                 | Rewrite deep relative imports to the shortest matching tsconfig alias |
| `removeUnused`      | boolean  | `true`                                 | Remove imports nothing references                                     |
| `removeSideEffects` | boolean  | `false`                                | Also remove side-effect imports like `import "./styles.css"`          |
| `groupImports`      | boolean  | `true`                                 | Separate imports into groups                                          |
| `groupOrder`        | string[] | `["external", "internal", "relative"]` | Order of the import groups                                            |
| `separateGroups`    | boolean  | `false`                                | Put a blank line between groups                                       |

**`sorting`** — AST-based reordering. Each sub-section respects code dependencies by default so a reorder never breaks a reference:

- `sorting.enabled` (default `true`) — master switch.
- `sorting.classMembers` — sort class members. Order by default: static properties, instance properties, constructor, accessors, static methods, instance methods. Set
  `groupByVisibility` to `true` to group by `public`/`protected`/`private` first.
- `sorting.reactComponents` — the same, applied to React component classes.
- `sorting.fileDeclarations` — order top-level declarations: interfaces, type aliases, enums, helper functions, helper variables, exported functions, exported variables,
  exported classes, default export, everything else.

**`spacing`** — blank-line rules. **Disabled by default** (`spacing.enabled: false`); opt in to turn it on:

| Option                  | Type    | Default | What it does                                       |
|-------------------------|---------|---------|----------------------------------------------------|
| `enabled`               | boolean | `false` | Apply blank-line rules at all                      |
| `betweenDeclarations`   | boolean | `true`  | Blank line between declarations of different kinds |
| `beforeReturns`         | boolean | `true`  | Blank line before `return` statements              |
| `betweenStatementTypes` | boolean | `true`  | Blank line between different statement types       |

**`packageJson`** and **`tsConfig`** — config-file sorting, both enabled by default:

- `packageJson.enabled` (default `true`), `packageJson.customSortOrder` (a company-standard field order by default), `packageJson.indentation` (default
  `4`).
- `tsConfig.enabled` (default `true`) sorts `tsconfig.json` keys alphabetically at every level, with `tsConfig.indentation` (default `4`).

**Other keys:**

- `indexGeneration` — generate barrel `index.ts` files for configured directories. **Disabled by default** (`indexGeneration.enabled: false`).
- `skipReactFiles` (default `false`) — set `true` to exclude `.tsx`/`.jsx` files from formatting. tsfmt handles JSX safely, so this is an opt-out for projects that want
  it, not a safety requirement.
- `formatterOrder` — override the order the formatter stages run in. The default is `IndexGeneration`, `CodeStyle`, `ImportOrganization`,
  `ASTTransformation`, `Spacing`.

### The defaults: tsfmt's opinions

Out of the box, with no config, tsfmt enforces:

- Double quotes for strings
- Semicolons always
- 4-space indentation, no tabs
- 120-character line width
- Trailing commas everywhere they're valid
- No space inside object literals (`{key: value}`), but spaces inside object type literals (`{key: string}`)
- Arrow parentheses omitted when possible (`x => x`, not `(x) => x`)
- Class members ordered: static properties, instance properties, constructor, accessors, static methods, instance methods
- File declarations ordered: interfaces, types, enums, helper functions, exported functions, classes, default export
- Imports grouped external → internal → relative, sorted within each group, with unused imports removed
- `package.json` fields and `tsconfig.json` keys sorted

Blank-line spacing (`spacing`) and index generation (`indexGeneration`) are off by default; turn them on in your config if you want them.

## Restrictions

Beyond formatting, tsfmt can enforce *architectural* rules about what code may import what — for example, "this UI folder may not import internal app modules."
Restrictions run as a read-only **gate** before any formatting starts. If a rule is violated, tsfmt prints each violation and exits non-zero **without formatting any
file** — this holds even under `--dry`.

Add a `restrictions.imports` list to your config. Each rule has a `files` glob list (relative to the project root, where `tsfmt.config.ts` lives) and either a `forbid`
list, an `allow` list, or both.

**Forbid list** — imports matching any pattern are violations:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["app_modules/library_to_extract_later/resources/**/*.{ts,tsx}"],
                forbid: [
                    {pattern: "@/**", message: "Library may not import internal app modules directly."},
                    {pattern: ["app_modules/Other/**", "**/app_modules/Other/**"], message: "No cross-module imports."},
                ],
            },
        ],
    },
});
```

A violation is reported like this, then the run stops:

```
src/Foo.ts:1:1  Library may not import internal app modules directly.  (imports "@/internal/Foo")
1 restriction violation(s). Formatting skipped — fix these first.
```

**Allow list** — any import whose specifier matches none of the `allow` globs is a violation. Omit `message` to get a generated one:

```ts
import {tsfmt} from "tsfmt";

export default tsfmt({
    restrictions: {
        imports: [
            {
                files: ["app_modules/library_to_extract_later/resources/**/*.{ts,tsx}"],
                allow: ["app_modules/library_to_extract_later/**", "@/ui/**"],
                message: "Library may only import from itself or the shared UI library.",
            },
        ],
    },
});
```

`allow` and `forbid` can be combined in one rule — both are checked for every import, so a specifier can be reported against each independently.

The gate is opt-in: omit `restrictions` and tsfmt is unaffected. When present, it runs on every invocation — bare or with explicit paths — with `files`
globs resolved relative to the current working directory. An invalid `restrictions` block (for example a `forbid` entry missing its `message`) is a hard failure: tsfmt
prints the config error and exits non-zero rather than silently formatting. Pass `--no-gate` to skip the gate for a run.

## How it works

You don't need to know the internals to use tsfmt, but a little context explains why it's safe to run on a real codebase.

tsfmt parses each file exactly once with [`ts-morph`](https://ts-morph.com/) — a trivia-preserving wrapper over the TypeScript compiler — into a shared model that every
formatting stage reads and mutates in place. There's no round-trip through strings between stages and no re-parsing, so the stages can't corrupt each other's work. The
file is written once, at the end, from the final state of that model.

Because the structural stages (sorting, import organization, quote style) operate on real syntax nodes rather than raw text, they're inherently JSX-safe — they only ever
touch actual code, never markup or string content. `.tsx`/`.jsx` files are parsed with the correct script kind derived from the file extension, so JSX text and
expressions are preserved exactly.

When tsfmt reorders class members or top-level declarations, it first analyzes the dependencies between them. If moving a declaration would place it before something it
relies on, tsfmt keeps the working order instead. Reorganization improves layout without breaking your code.

tsfmt only writes files that actually change — unchanged files are left untouched, and `--dry` reports the count of files that would change without touching any of them.

## Troubleshooting

**"could not find the optional dependency `@tsfmt/<platform>`"** — the platform binary wasn't installed. This usually means optional dependencies were skipped (for
example `npm install --omit=optional` or `--no-optional`). Reinstall without omitting optional dependencies. If you're running a binary you manage yourself, set
`TSFMT_BINARY_PATH` to its full path instead.

**"Unsupported file type"** — a path you named isn't `.ts`, `.tsx`, `.js`, or `.jsx`. Only those extensions are formatted.

**A file I excluded still got formatted** — you probably named it (or a directory or glob containing it) on the command line. Positional CLI paths bypass
`paths.exclude` on purpose. Run a bare `tsfmt` to honor your config's excludes, or remove the path from the command.

**The run stopped without formatting anything** — a restrictions rule was violated, or your `restrictions` config is invalid. Read the printed violations and fix them, or
pass `--no-gate` to format anyway.

**My config isn't being applied** — tsfmt loads `tsfmt.config.ts` from the current working directory. Confirm you're running from the project root and that the file
exports `tsfmt({ ... })` as its default export. tsfmt prints `Using custom configuration from tsfmt.config.ts` when it finds one. If the config fails to load, tsfmt
prints the error and falls back to the defaults for that run.

## Philosophy

tsfmt is built on the idea that formatting shouldn't just make code look consistent — it should impose a logical structure that makes code easier to navigate and
maintain. By combining traditional pretty-printing with AST-based transformations, it enforces both visual and structural consistency.

The tool is intentionally opinionated to end formatting debates and establish shared standards across a codebase, prioritizing readability and consistency over individual
preference.

## License

Available on the [documentation site](https://docs.encoredigitalgroup.com/license)

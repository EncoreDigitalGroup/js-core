# 1. Parse-once ts-morph pipeline for AST/CST formatting

## Status

Accepted

## Context

tsfmt's original pipeline treated each formatting rule as an independent `apply(source, filePath): string`
transformation: every rule re-parsed the file's text (via the raw TypeScript compiler API, string manipulation, or both) and handed a new string to the next rule. This
worked for plain `.ts` files, but it had two compounding problems for `.tsx`/`.jsx`:

- Several rules used regex- or string-based transformations that did not understand JSX trivia (text inside elements, JSX expressions, embedded template literals).
  Running those rules against `.tsx`/`.jsx` source regularly corrupted JSX markup, so the pipeline had to gate React files out with `skipReactFiles` as a corruption guard
  rather than an opt-in convenience.
- Re-parsing the file once per rule was wasteful and made it hard to reason about whether a given transformation had already invalidated a downstream rule's assumptions
  about node positions.

The question this ADR answers: how should tsfmt stop clobbering `.tsx`/`.jsx` source and gain real, safe TSX support, without regressing existing `.ts`/`.js` formatting
behavior or its existing test suite?

## Options Considered

1. **ts-morph, parsed once per file, threaded through every rule** — Adopt `ts-morph` (a trivia-preserving wrapper over the TypeScript compiler API) as the shared parsing
   layer. Parse each file exactly once into a
   `FormatContext` holding a `ts-morph` `Project`/`SourceFile`, and have every rule implement a single native
   `applyToContext(context)` contract that mutates the shared model in place. `ts-morph` derives `ScriptKind`
   from the real file extension, so `.tsx`/`.jsx` files get correct JSX-aware parsing and printing without bespoke trivia handling in tsfmt itself.
2. **recast or Babel-based re-printing** — Adopt a different AST toolkit (`recast` layered on Babel, or Babel alone) that also preserves formatting/trivia across
   transformations. This would solve the same trivia-preservation problem but would mean parsing TypeScript- and JSX-specific syntax through a TypeScript-unaware or
   differently-configured parser, risking subtle divergence from `tsc`'s own understanding of the source (type-only imports, satisfies expressions, and other
   TypeScript-specific syntax), and would add a second parser ecosystem alongside the TypeScript compiler API that tsfmt already depends on for dependency resolution.
3. **A hand-rolled trivia-preservation layer on the raw TypeScript compiler API** — Keep using
   `typescript`'s compiler API directly (as the pre-existing `ASTTransformer` did) but build tsfmt's own layer for preserving comments, whitespace, and JSX trivia across
   edits. This avoids adding a new dependency, but re-implements a well-known hard problem (trivia-preserving AST manipulation) that
   `ts-morph` already solves, with a much larger and more fragile surface area to maintain and test.

For the rule-execution model specifically, two further options were weighed:

- **Structural-batch-plus-region-skip** — Split rules into structural rules that operate on real AST nodes (inherently JSX-safe) and region rules that operate on raw text
  but consult a shared
  `getProtectedRanges()` helper to skip JSX text/expression and template-literal ranges, so text-level whitespace rules never rewrite content embedded in markup or
  strings.
- **Full AST rewrite of whitespace rules** — Reimplement every blank-line/indentation/spacing rule as pure AST-node manipulation instead of text-range editing,
  eliminating the region-skip mechanism and the residual
  `replaceWithText` re-parses it requires.

## Decision

Adopt **ts-morph, parsed once per file** (Option 1) as the shared model for the entire formatting pipeline. Every formatting rule — including the side-effect-only
`IndexGenerationRule` — implements a single native
`applyToContext(context: FormatContext): void` method that mutates the shared `ts-morph` `SourceFile`
directly; the pipeline parses each file exactly once up front and emits it exactly once at the end.

For rule execution, adopt **structural-batch-plus-region-skip**: sorting, import organization, and quote-style rules operate directly on AST nodes and are therefore
inherently JSX-safe. Whitespace/blank-line/indentation rules remain text-range based for practical reasons (they reason about line boundaries and blank-line counts, which
map naturally to text ranges, not AST nodes) but consult
`FormatContext.getProtectedRanges()` to skip ranges that fall inside JSX text, JSX expressions, or template literals. These region rules are the only place a
`replaceWithText` re-parse still happens after the initial parse, since they mutate text directly rather than AST nodes — this is an inherent property of text-level
whitespace formatting, not a leftover of the migration.

With every rule migrated to `applyToContext`, the transitional legacy `apply(source, filePath): string` bridge in `BaseFormattingRule` and its optional declaration on
`IFormattingRule` are removed; `BaseFormattingRule`
now declares `applyToContext` as `abstract`. `skipReactFiles` is retained as a config key but is now documented as an explicit opt-out rather than a corruption guard,
since `.tsx`/`.jsx` files are formatted safely by default. The dead `ASTTransformer` (a pre-migration compiler-API helper with zero remaining callers) is deleted.

## Consequences

- **One new bundled dependency.** `ts-morph` is added as a build-time `devDependency` (never a runtime
  `dependencies` entry) and its AST/printing logic is bundled into the compiled binary.
- **Larger binary.** Bundling `ts-morph` (and its `typescript` peer usage) increases the size of the built
  `tsfmt` executable compared to the prior raw-compiler-API approach.
- **Single parse per file.** Every rule now shares one `ts-morph` `SourceFile` per file instead of each rule re-parsing the current text, which removes redundant parsing
  work and makes it possible to reason about the file's state as a single mutable model across the whole pipeline.
- **`.tsx`/`.jsx` are now formatted, not skipped by default.** `skipReactFiles` still exists for callers that want to exclude React files for other reasons, but it is no
  longer required to avoid corruption.
- **Region rules keep a residual re-parse.** Text-level whitespace rules still call `replaceWithText` after editing text directly, so those specific rules re-parse their
  own output; this is scoped to region rules only and does not apply to the rest of the pipeline.

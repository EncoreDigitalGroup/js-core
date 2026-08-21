# 3. Restrictions gate as a standalone pre-format domain

## Status

Accepted

## Context

tsfmt is an opinionated formatter, but real projects also enforce *architectural* rules about what code may exist where — most commonly "this directory may not import
that one" (eslint's `no-restricted-imports` rule is the motivating example). Teams that already use tsfmt for formatting still needed a second tool, typically eslint with
a
`no-restricted-imports` rule, purely to enforce these import boundaries, adding a second parse of every file, a second config surface, and a second CLI to run in CI.

The question this ADR answers: how should tsfmt enforce architectural import rules — starting with a `forbid` list of disallowed import patterns per file glob — without
becoming a second linter, and without ever letting a formatting run silently paper over a violated architectural boundary?

## Options Considered

1. **A formatting-pipeline rule with a diagnostics channel** — Add restrictions as another `IFormattingRule` inside the existing `FormatterPipeline`, extending
   `FormatContext` with a diagnostics/violations list that rules could append to, and having the CLI inspect that list after the pipeline ran. This reuses the existing
   parse-once
   `ts-morph` model but conflates two different concerns inside one abstraction: `IFormattingRule` and
   `FormatterPipeline` exist to describe pure text transforms, and teaching them about a non-zero-exit violation state would mean every rule implementer now has to reason
   about whether their rule is a formatter or a gate, and the pipeline would need to special-case "format some files, then discover late that the whole run should have
   been rejected" after possibly having already written other files to disk.
2. **A standalone pre-format gate (chosen)** — Give restrictions their own module, `RestrictionChecker`, invoked by the CLI before any pipeline is constructed and before
   the `package.json`/`tsconfig.json` sorting steps. The gate is read-only: it never touches `FormatterPipeline` or any `IFormattingRule`, and it exits non-zero before a
   single byte is written when a rule is violated. This mirrors how `package.json` and `tsconfig.json` sorting already live as standalone helpers (`sortPackageFile`,
   `sortTsConfigFile`) called directly from the CLI rather than folded into the formatting pipeline.
3. **Stay on eslint** — Keep `no-restricted-imports` (or an equivalent eslint rule) as the source of truth for import-boundary enforcement and do nothing in tsfmt. This
   avoids new tsfmt surface area entirely, but leaves teams running two tools with two configs, two parses of every file, and no way to guarantee (from tsfmt's side) that
   a formatting run never proceeds past a violated boundary — the two tools' exit codes are wired together only by whatever CI script happens to run both.

## Decision

Adopt the **standalone pre-format gate** (Option 2). Restrictions are a *distinct domain from formatting*:
`RestrictionChecker` (`src/core/restrictions/RestrictionChecker.ts`) is a plain, non-DI class that checks a set of files' import declarations against an optional
`restrictions.imports` config block and returns violations; it never mutates a file. The CLI calls it — via `runRestrictionGate` — at the very top of the
directory-formatting branch, before the package.json/tsconfig sorting steps and before the formatter-enabled guard, so a violation leaves *every*
file untouched, including files the pipeline would otherwise have formatted successfully. The gate runs regardless of
`--dry`, because a dry run must still refuse to report on (or format) a tree that violates a business rule. A new
`--no-gate` flag is a simple early return inside the gate function — bypassing it entirely — for callers who want formatting without the architectural check.

`restrictions` is absent from every `ConfigDefaults` factory, so `ConfigMerger.deepMerge` leaves it absent unless a project's `tsfmt.config.ts` explicitly supplies it:
the gate is opt-in, and a zero-config project is completely unaffected.

## Consequences

- **The gate runs only for directory/project invocations, not single-file ones.** A rule's `files` globs are authored relative to the project root (the directory
  `tsfmt.config.ts` lives in), so the match base is only well-defined when the CLI target is that project root. Single-file invocations (`tsfmt path/to/file.ts`) do not
  run the gate; this is a project-wide concern, not a per-file one.
- **An invalid `restrictions` block hard-fails the gate rather than silently falling back to defaults.**
  `ConfigLoader.loadConfig` validates the general config shape inside a `try/catch` that, on any throw, prints the error and falls back to
  `ConfigDefaults.getDefaultConfig()` — a config with no `restrictions` key at all. If restriction validation lived inside that same `validate()`/`validateOrThrow()`
  path, a malformed `forbid` entry would throw, be swallowed by that catch, and silently disable the very boundary it was meant to enforce while tsfmt reported success.
  Restriction validation is instead a dedicated `ConfigValidator.validateRestrictions` method, called directly by the gate and never by `validate()`, so a malformed
  restrictions block calls `process.exit(1)`
  with the validation errors instead of vanishing into a defaults fallback.
- **`FormatterPipeline` and every `IFormattingRule` are untouched.** They remain pure text transforms with no notion of a violation or a non-zero exit; the restrictions
  domain owns its own module, its own config key, and its own exit path.
- **A rule's `files` globs are matched relative to the config directory, normalized to POSIX separators**, so glob authoring is consistent across platforms even though
  tsfmt itself runs on Windows.
- **`tsfmt-ignore`, the per-file formatting escape hatch, does not silence the gate.** Formatting and architectural boundaries are different concerns, and a file opted
  out of formatting is still checked for restriction violations.

# 4. `paths` config key and two-model file discovery

## Status

Accepted

## Context

Until now, which files a run formatted was decided two different ways with no single source of truth. A bare `tsfmt` or `tsfmt <dir>` discovered files through
`sorting.include`/`sorting.exclude` — keys that lived on `SortingConfig` despite never scoping the AST sorting rules themselves; they were purely a file-discovery
mechanism bolted onto the sorting config. A `tsfmt <file>` invocation bypassed discovery entirely through a separate single-file code path that also skipped the
restrictions gate and the `package.json`/`tsconfig.json` sorting steps.

This left three problems: the discovery globs were misnamed (they read as if they scoped sorting), there was no way to configure a project's formatting target set once
and invoke `tsfmt` bare in scripts/CI, and single-file invocations silently behaved differently from directory ones (no gate, no json sorting).

The question this ADR answers: how should `paths.include` and `paths.exclude` combine on a config-driven run, how should command-line paths interact with them, and how
should the CLI dispatch so every invocation behaves consistently?

## Options Considered

For how config `include`/`exclude` combine on a bare run:

1. **Narrowing** — treat `include` as the *only* files scanned (empty means scan nothing, or everything), with `exclude` subtracted. Intuitive for an allow-list, but
   makes the common case ("format everything except X") require enumerating the whole tree in `include`.
2. **Exclude-wins** — scan everything, subtract `exclude`, and treat `include` as a further filter (intersection). Makes `include` unable to rescue a specifically-wanted
   file that a broad `exclude` caught.
3. **Augmenting (chosen)** — scan everything minus `exclude` and the critical excludes, then add `include` matches back on top. `include` overrides `exclude` (an
   excluded-but-included file returns) but never resurrects a critical directory (`node_modules`, `dist`, `build`, `vendor`, `bin`). Empty `include` + empty `exclude` is
   exactly the `tsfmt .` full scan.

For how command-line paths interact with config:

A. **Command-line paths merge with config `include`** — union of both. Makes it impossible to scope a run more narrowly than the config already allows.
B. **Command-line paths replace `include` and still honor `exclude`** — scoped, but a file named explicitly on the CLI could still be silently skipped by a config
   `exclude`, which is surprising.
C. **Command-line paths replace `include` and bypass `exclude` (chosen)** — passing paths means "format exactly these," so `exclude` is not consulted; only the critical
   excludes are still pruned inside a passed directory or glob.

## Decision

Add a top-level `paths` key (`PathsConfig { include?: string[]; exclude?: string[] }`, both defaulting to `[]`) as the single source of truth for file discovery, and
remove `include`/`exclude` from `SortingConfig`. Discovery lives in one `discoverTargetFiles(cwd, config, cliPaths)` function in `src/cli.ts` with two models chosen by
whether the CLI passed positional paths:

- **Config-driven (no CLI paths) — augmenting** (Option 3): scan `**/*.{ts,tsx,js,jsx}` under `cwd` ignoring `paths.exclude` plus the critical excludes, then add back
  `paths.include` matches (ignoring only the critical excludes). Empty `include` returns just the scan; empty `include` and `exclude` is the `tsfmt .` behavior.
- **CLI-driven (CLI paths present) — narrowing + exclude bypass** (Option C): `main()` copies the passed paths into `config.paths.include` in memory (the on-disk config is
  never written), and each entry is expanded verbatim — a named file is always formatted (erroring on an unsupported extension), a directory is scanned with critical
  excludes only, and a nonexistent entry containing glob magic is matched with critical excludes only (an empty match is not an error) while a nonexistent literal path is
  an error. `paths.exclude` is never consulted.

The critical exclude list moves out of an inline literal in `cli.ts` into `ConfigDefaults.getCriticalExcludePatterns()`. Every invocation — bare, single file, or
multiple paths — now flows through **one unified pipeline**: restriction gate → `package.json` sort → `tsconfig.json` sort → formatter pipeline, all rooted at `cwd`. The
separate single-file code path (`formatSingleFile`) and the file-vs-directory `fs.statSync` dispatch are deleted.

`ConfigMerger` is unchanged: because `getDefaultConfig()` now carries `paths: {include: [], exclude: []}`, `deepMerge` recurses into a user's `paths` object and backfills
any omitted sub-array, so `config.paths` and both arrays are always present after load. `ConfigValidator` gains a `paths` block (each supplied array must contain only
non-empty strings) and drops the old `sorting.include` empty-array warning.

## Consequences

- **Single-file invocations now run the restriction gate and sort `package.json`/`tsconfig.json`.** This is a deliberate behavior change: `tsfmt file.ts` is no longer a
  special case that skips those steps. It supersedes the ADR-0003 consequence "the gate runs only for directory/project invocations, not single-file ones" — the gate now
  runs for every invocation, with `restrictions.files` globs resolved relative to `cwd` (which is also where config is loaded from).
- **`SortingConfig.include`/`SortingConfig.exclude` are removed — a breaking change to the exported config type.** Any consumer `tsfmt.config.ts` that set them must move
  the globs to `paths.include`/`paths.exclude`. No automated migration is provided; the removal and the move are documented in the README.
- **`PathsConfig` is safe to export from the dependency-free public surface.** It carries only `string[]` fields, so it adds no `ts-morph`/`typescript`/`reflect-metadata`
  dependency to `src/public.ts`, preserving the invariant from ADR-0001/0002.
- **Config is still loaded once, from `cwd`.** There is no per-file config resolution; a run reads one `tsfmt.config.ts` from the current working directory.
- **The critical excludes (`node_modules`, `dist`, `build`, `vendor`, `bin`) are an unconditional floor.** They are pruned even from CLI-driven directory and glob
  expansion; only a file named explicitly and directly on the CLI can reach inside one.

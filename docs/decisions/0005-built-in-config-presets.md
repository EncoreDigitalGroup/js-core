# 5. Built-in config presets

## Status

Accepted

## Context

Users repeatedly need the same non-default configuration for a given ecosystem — for example, a Laravel project wants single quotes and a small set of exclude paths that
differ from tsfmt's defaults. Before this change, every such project had to restate those values by hand in its `tsfmt.config.ts`, and there was no shared, named bundle
they could opt into.

The requirement: let a user set a single `preset` key (e.g. `preset: "laravel"`) and have a bundle of config values load automatically. Critically, the preset must load
*before* the user's own configuration so the user can still override anything the preset sets. The design also has to make adding future presets cheap, and must not
violate the dependency-free invariant of the public config surface (ADR-0001/0002): `src/public.ts` and `src/core/config/ConfigTypes.ts` must not pull in
`ts-morph`/`typescript`/`reflect-metadata`.

The questions this ADR answers: where is the preset layer applied, how is a preset resolved, what happens on an unknown name, and how is the `preset` key typed.

## Options Considered

For **where the preset layer is applied**:

1. **In the `tsfmt()` helper only.** `tsfmt()` would detect `preset` and layer it in. Rejected: `ConfigLoader.loadConfig` also merges (for raw-object exports and its
   second normalizing merge), so preset handling in `tsfmt()` alone would miss those paths.
2. **In `ConfigMerger.merge()` (chosen).** Both `tsfmt()` and `ConfigLoader` funnel through `merge()`, so implementing preset resolution there once covers every entry
   point. `merge()` builds an ordered layer list — `[preset?, userConfig]` — and delegates to the existing `mergeMultiple()`, which already seeds from `getDefaultConfig()`,
   producing **defaults → preset → user** with no new merge machinery.

For **unknown-preset behavior**:

- **Throw a clear error (chosen)** naming the unknown preset and listing the valid names. It surfaces through `ConfigLoader.loadConfig`'s existing try/catch, which prints
  the error and falls back to the default config for that run — the same fail-loud-then-default posture every other config load error already has. This matches tsfmt's
  convention that bad config is a visible failure, not a silent one (see the restrictions gate, ADR-0003).
- **Warn and ignore.** Rejected: silently proceeding with different-than-intended behavior masks the typo and produces confusing diffs.

For **how the `preset` key is typed**:

- **Free `string`.** Rejected: gives no editor feedback on typos.
- **Registry-derived string-literal union (chosen).** `PresetName = keyof typeof PRESETS` derives the type from the runtime registry, so the two never drift and a mistyped
  name is flagged in an editor. A runtime guard in `resolvePreset` still covers JavaScript consumers and raw-object exports.

## Decision

Add a top-level optional `preset?: PresetName` key to `CoreConfig`. Presets live in `src/core/config/presets/`: one file per preset exporting a `Partial<CoreConfig>` of
only the values that differ from the defaults, plus a hand-maintained `index.ts` registry holding the `PRESETS` map, the derived `PresetName` type, and
`resolvePreset(name)` (which throws, listing valid names, on an unknown preset).

`ConfigMerger.merge()` builds an ordered layer list — the resolved preset (when `preset` is set) followed by the user config — and passes it to `mergeMultiple()`, giving
the order **defaults → preset → user overrides**.

The `preset` key type is derived from the registry, so adding a preset is a two-line change: create `presets/<name>.ts` and add one entry to `PRESETS`. `PresetName` and
editor autocomplete update automatically.

## Consequences

- **The double merge is idempotent.** `tsfmt()` merges at config-author time and returns a full config that still carries `preset`; `ConfigLoader` merges again. The second
  pass re-layers defaults → preset → the already-merged config, and since the user's values already won in that object, re-applying the preset underneath changes nothing.
- **The dependency-free invariant is preserved.** `presets/index.ts` imports `CoreConfig` as a **type-only** import and each preset is a plain object of primitive/array
  values. `ConfigTypes.ts` imports `PresetName` via `import type`, which is fully erased at compile time, so the `ConfigTypes ⇄ presets` reference creates no runtime import
  cycle and adds no heavy dependency. `PresetName` is therefore safe to re-export from `src/public.ts`.
- **The `preset` key persists in the merged config.** It is harmless — the CLI consumes only the concrete config keys and ignores `preset` — and it lets tooling introspect
  which preset was active.
- **Backward compatible.** A config with no `preset` key builds the layer list without a preset, so behavior is exactly `defaults → user` as before.
- **Adding a preset is cheap.** New file + one registry line; no changes to the merger, the type, or the loader.

# 2. Per-arch npm binary distribution via optionalDependencies

## Status

Accepted

## Context

tsfmt ships as a Bun-compiled native binary rather than a pure-JavaScript package, because the formatting pipeline depends on Bun's
compiled-executable startup speed for its CLI use case. Prior to this decision, the published `tsfmt` npm package was a thin Node launcher
that, on first run, downloaded a standalone binary for the current platform from this project's GitLab Generic Package Registry and cached
it under `~/.cache/tsfmt/<version>/` (or `$XDG_CACHE_HOME/tsfmt/<version>/`).

This runtime-download model had several problems:

- **First-run network dependency.** Every fresh install (or cache miss, e.g. in a CI container rebuilt from scratch) required an outbound
  network call to GitLab at the moment a developer or CI job first ran `tsfmt`, turning a routine `npx tsfmt` invocation into a network
  operation with its own failure modes.
- **GitLab uptime as a hard dependency.** If GitLab's Generic Package Registry was unreachable or rate-limited, `tsfmt` failed to run at
  all, even though the npm package itself had installed successfully.
- **A cache directory to manage.** The `~/.cache/tsfmt/<version>/` cache needed to exist, be writable, and be correctly invalidated across
  version bumps; this added a class of environment-specific bugs (permission errors, stale caches, cache poisoning) that had nothing to do
  with formatting logic.
- **No offline support.** A machine without network access could not run `tsfmt` at all on first use, even if `npm install` itself had
  succeeded from a local registry mirror.

The question this ADR answers: how should tsfmt distribute its platform-specific compiled binaries through npm without a runtime download
step, while keeping the published package size reasonable?

## Options Considered

1. **Runtime download (status quo)** — Keep the small Node launcher and have it download the matching binary from the GitLab Generic
   Package Registry on first run, caching it locally. This was the existing approach and required no changes, but it retained every
   problem described above: first-run network dependency, GitLab uptime as a hard dependency, a cache directory to manage, and no offline
   support.
2. **Single fat package bundling all eight binaries** — Publish one `tsfmt` package that embeds all eight platform binaries (macOS
   arm64/x64, Linux glibc x64/arm64, Linux musl x64/arm64, Windows x64/arm64) directly, with the launcher selecting the right one at
   runtime. This removes the network dependency entirely but was rejected on size grounds: each Bun-compiled binary is roughly 57 MB, so
   bundling all eight into every install would add up to 450 MB or more downloaded and stored on disk for every consumer, regardless of
   which single platform they actually run on.
3. **Per-arch optionalDependencies (chosen)** — Publish nine packages in lockstep: the main `tsfmt` package (containing only the Node
   launcher) plus eight platform-specific `@tsfmt/<platform>` packages, each containing exactly one compiled binary. The main package
   lists all eight as `optionalDependencies`; npm's platform-matching resolves and installs only the one whose `os`/`cpu` fields match the
   current machine, so a given install pulls down only the ~57 MB binary it actually needs. This is the same distribution model used by
   esbuild and Biome for their own per-platform native binaries.

## Decision

Adopt **per-arch optionalDependencies** (Option 3). The main `tsfmt` package contains only the Node launcher (`scripts/tsfmt-bin.js`,
kept as plain CommonJS with no non-builtin imports) and declares all eight `@tsfmt/<platform>` packages as `optionalDependencies`. Each
platform package contains a single Bun-compiled binary and the `os`/`cpu` fields npm uses to select it during install. Installing `tsfmt`
via `npm install --save-dev tsfmt`, `npx tsfmt`, or `bunx tsfmt` therefore pulls in only the one matching binary package automatically —
no download step, no cache directory, and the tool works offline as soon as install has completed. `TSFMT_BINARY_PATH` is retained as an
escape hatch for callers who want to point the launcher at a locally built binary instead of the installed platform package.

Eight platform targets are retained: macOS (arm64, x64), Linux glibc (x64, arm64), Linux musl (x64, arm64), Windows (x64, arm64). Linux
musl gets its own separate packages (rather than being folded into the glibc x64/arm64 targets) because Bun-compiled binaries are not
statically linked against libc, so a binary built against glibc will not run on a musl-based system (e.g. Alpine) and vice versa.

## Consequences

- **Nine lockstep-versioned packages.** The main `tsfmt` package and all eight `@tsfmt/<platform>` packages must be published together at
  the same version on every release; a mismatch (e.g. `tsfmt@1.2.0` depending on a `@tsfmt/linux-x64@1.1.0` that was never published)
  would break installation for that platform.
- **Separate musl packages.** Because Bun binaries are not statically linked against libc, Linux musl systems need their own binaries and
  packages distinct from the glibc ones, doubling the Linux target count from two to four.
- **The launcher is the runtime source of truth.** `scripts/tsfmt-bin.js` resolves which platform package to require (or honors
  `TSFMT_BINARY_PATH`) at runtime; there is no build-time step that hardcodes a platform choice into the published main package.
- **Publish is self-contained in `build.ts`.** Building and publishing all nine packages is driven from the project's own build script
  rather than a separate external release pipeline, keeping the staging of per-arch binaries under gitignored `dist-npm/` and the publish
  step in one place.
- **No more runtime download or cache.** The `~/.cache/tsfmt/<version>/` cache directory, the first-run network call to GitLab's Generic
  Package Registry, and the failure modes tied to both are eliminated; a successful `npm install` is now sufficient for `tsfmt` to run,
  including fully offline.

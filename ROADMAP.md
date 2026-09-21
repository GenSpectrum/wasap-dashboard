# Roadmap

Where this project is against the original extraction plan, and what's left.
Condensed from the full step-by-step planning docs (`~/standalone-wasap/` on
the machine this was built on) — see `git log` for the detailed build history
of each step; this file only tracks what's still outstanding.

## Done

- **Step 1 — standalone repo.** Vite + React SPA, no Astro. `covid` / `rsvA` /
  `rsvB` render, all six analysis modes wired, organism dropdown, real-path
  routing (`react-router-dom` v7 `createBrowserRouter`), full Vitest setup
  (`node` + `browser` projects).
- **Step 2 — inline `dashboard-components`.** The component library is a hard
  fork, ported Preact→React, vendored into `src/components/` (no
  `@genspectrum/dashboard-components` dependency, no upstream tracking).
- **Step 3, phases 0–5 — native SILO for the wastewater data.** Dead-code
  pruning; the SILO connection/transport layer (`src/dataLayer/transport/`,
  vendored from `wastewater-analytics-experiment`); Tier-1 reads (location/date
  filters, dataset stats, health check) moved off LAPIS; the lineage picker
  moved to a minimal clinical-LAPIS client; both over-time grids
  (`gs-mutations-over-time`, `gs-queries-over-time`) rewritten against SILO.
- Assorted hardening after phase 5 landed: organism config externalized to a
  zod-validated `config.json` (no config ⇒ empty app, not a hardcoded
  default), lint/format aligned with the upstream `dashboards`/
  `dashboard-components` repos (ESLint added), the external-API clients
  gathered under `src/externalData/`, the SILO data layer reorganized into
  `src/dataLayer/{transport,queries,hooks}/`.

**Known accepted gap:** RSV mutations-/queries-over-time is broken (SILO
times out grouping by RSV's non-dictionary-encoded date column) — see "Next
up" below.

## Next up — step 3, phases 6–8

1. **Instance selection.** `config.json` bundled default + a `?silo=`
   override + a settings panel + `localStorage`, modeled on
   `wastewater-analytics-experiment`'s `src/data/instance.tsx`. This is also
   the seam a future "point at another SILO" / "load your own data" dropdown
   entry plugs into.
2. **`WasmSiloQueryClient`** + a dataset-loading UI, for the in-browser mode.
   **Blocked externally** on a 64-bit WASM SILO build (the current build is
   32-bit, ~4GB address-space ceiling per handle) — until then this is only
   prototypable against a hand-prepared dataset. Also needs COOP/COEP
   cross-origin-isolation headers wired up (the WASM build uses pthreads).
3. **Offline-mode decisions.** For every mode that still needs clinical LAPIS
   / `query/parse` / the collections backends (`variant`, `collection`,
   `covSpectrumCollection`): decide keep-remote vs. disable vs. bundle, per
   mode, for the in-browser and desktop builds. Nothing decided yet.

## Not started — step 4: Tauri desktop bundle

Still a stub. Depends on phase 6/7's client abstraction (a client that can
point at a local SILO over HTTP or Tauri IPC). Rough shape, nothing decided:

- Tauri v2 shell around the same Vite build as the hosted SPA.
- SILO as a Tauri sidecar (bundle a platform binary, start/health-check/stop
  it) — or an `invoke`-bridged in-process alternative. Undecided.
- Dataset management: ship a default processed SILO state, let users
  import/update datasets, store under the OS app-data dir. The 64-bit WASM
  ceiling does **not** block desktop — a native sidecar has no such limit;
  this is part of desktop's "larger datasets" value proposition.
- A small custom-protocol fallback handler in the Rust shell for hard
  reloads / deep links into a sub-path (the webview serves `dist/` over a
  custom protocol that 404s on unmatched paths; in-app navigation is
  unaffected since it's `pushState`).
- Packaging: signing, notarization, auto-update, CI matrix. Not started.

Open questions: native SILO sidecar vs. WASM-in-webview vs. both; HTTP-on-
localhost vs. Tauri IPC; where desktop users' datasets come from; whether
desktop bundles/proxies the collections backend + clinical LAPIS or requires
network access for those; binary size budget.

## External dependencies (outside this project, block parts of it)

- **64-bit WASM build of SILO/RhyDB** — required for the in-browser mode
  (phase 7) and to widen what "browser" can realistically hold. Does not
  exist yet.
- **RhyDB BAM importer** (a generic BAM → SILO preprocessing pipeline) — a
  separate project, out of scope here, but upstream of "drag-and-drop your
  own data" ever being real for ad-hoc users.
- **SILO `DATE32` grouping performance** — RSV's over-time views are blocked
  on this (grouping by RSV's non-dictionary-encoded date column times out).
  Worth checking status before re-attempting a client-side workaround.

## Open product questions

Not blocking today's code, but worth resolving before investing further in
the areas they touch:

- **What defines a "known organism"?** Today it's three hardcoded datasets
  (`covid`/`rsvA`/`rsvB`) via `config.json`. The longer-term model — a
  registry per organism (reference genome, lineage definitions, pango
  aliases, collection linkage, clinical-LAPIS URLs), and whether adding one
  is a config change or a code change — isn't decided. Resolve before the
  organism-selector/config shape hardens further.
- **One config-parameterised dashboard vs. genuinely different dashboards per
  organism?** The dashboard (`WasapLayout` and the page of each mode) is currently
  parameterised by config. If organisms are meant to eventually get different modes/
  visualizations, note whether the current approach scales to that or is a
  knowingly deferred refactor — so nobody over-invests in generality it
  doesn't have yet.
- **Real v1 priority across the three audiences** (self-hosters / ad-hoc
  browser analysts / desktop users — see README). Audience (b) is blocked on
  the two external dependencies above, so the practical near-term scope is
  probably (a) self-hosting + (c) desktop with bundled/pointed-at data, with
  browser-upload as an explicit later milestone — but this hasn't been
  written down as a decision anywhere.
- **Third-party hosting / self-hosting story.** Config surface for someone
  running their own dashboard against their own SILO (which organisms, which
  modes enabled, branding, deploy story, SILO setup expectations — the
  dict-encoded date column requirement in particular). Nothing built; the
  `config.json` module should stay structured so this can grow into it.
- **Concrete data sizes.** How big is the real dataset (SILO state dir /
  NDJSON)? What should a typical bring-your-own-data user's dataset size be
  assumed to be? Does the eventual 64-bit WASM build realistically cover
  that range, or does desktop's value proposition rest mainly on
  look-and-feel rather than capacity? Not measured yet.

## Also see

- `TODO.md` — small in-flight code-level cleanups (not roadmap-level).

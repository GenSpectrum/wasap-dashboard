# Architecture

Why the read path is split the way it is, why the over-time queries are
shaped the way they are, and what a future contributor needs to know before
touching any of it. History condensed from this project's original planning
docs (`~/standalone-wasap/` on the machine this was built on) — the "why",
kept; the step-by-step build log, dropped (see `git log` for that).

## Two data sources, on purpose

| Data                                                                                         | Source                                                                    | Why                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The wastewater dataset itself (mutations, dates, locations, over-time views)                 | **SILO**, native SaneQL, `src/dataLayer/{transport,queries,hooks}/`       | The whole point of this project: run against a local/embedded SILO eventually (browser WASM, desktop native), not just a remote LAPIS.   |
| Lineage definitions (`gs-lineage-filter`), computed variant signatures, Jaccard index        | **Clinical LAPIS** (cov-spectrum / pathoplexus), `src/externalData/lapis` | SILO has no lineage-definition DAG. Deliberately kept on LAPIS — a documented "wart", not an oversight.                                  |
| Advanced query parsing (`query/parse`, used by `collection` / `covSpectrumCollection` modes) | **The W-ASAP LAPIS instance**                                             | Not in the WASM SILO embind surface (`preprocess/load/save/query/info/dispose` — no `parse`). These modes carry a live-LAPIS dependency. |
| Predefined-variant collections, resistance-mutation sets                                     | **GenSpectrum / cov-spectrum collections HTTP backends**                  | Separate service entirely, unrelated to LAPIS/SILO.                                                                                      |

**Reading this repo:** if a hook lives in `src/dataLayer/`, it queries SILO
directly with SaneQL. If it lives in `src/externalData/`, it's talking to one
of the remote HTTP APIs above. There is no LAPIS in the wastewater-data read
path itself — only in the three carved-out exceptions above.

## Why native SILO, not a LAPIS-compatibility shim

The eventual browser/desktop modes embed SILO directly
(`@rhydb/rhydb-wasm`, or a native sidecar under Tauri). That WASM module
exposes exactly `preprocess / load / save / query / info / dispose` — `query`
takes a **SaneQL string** and returns NDJSON. There is no LAPIS HTTP layer
inside it. So any code path that assumes LAPIS's JSON `POST` + flat filter
object + server-side `groupBy`/`fields` simply cannot run against embedded
SILO. The rewrite in `src/dataLayer/` + `src/query/` targets SaneQL from the
start, so the same code works against a remote SILO today and an embedded one
later — no separate "offline" code path to maintain.

The capability gap that drove this (kept as a reference, not exhaustive):

| Concern                        | LAPIS                                                  | Native SILO                                                                                                           | Consequence                                                                                                        |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Transport                      | JSON POST, `LapisFilter` body                          | `text/plain` SaneQL expression, NDJSON response                                                                       | New query layer, not a filter-object translation                                                                   |
| Aggregation                    | server-side `groupBy` + arbitrary `fields`             | `count()` is the **only** aggregate — no `sum`/`avg`/`countDistinct`                                                  | Proportion denominators computed client-side                                                                       |
| Sequence aggregation           | `mutations()` grouped server-side                      | `mutations()` collapses the **whole** filtered set — cannot be grouped                                                | "mutations per day" needs one query per bucket/position, not one grouped query                                     |
| Date grouping                  | server groups by any date field                        | grouping by a `DATE32` column is pathological (seconds → gateway timeout); needs a **dictionary-encoded** date column | Every bucketed view depends on the instance carrying a dict-encoded date column — RSV doesn't have one (see below) |
| `variantQuery` strings         | evaluated server-side per bucket                       | no equivalent                                                                                                         | Translated to a typed SaneQL AST client-side (`src/dataLayer/queries/siloFilterExpression.ts`)                     |
| Reference genome / lineage DAG | `/sample/referenceGenome`, `/sample/lineageDefinition` | no equivalent                                                                                                         | Bundle, or (lineage) stay on clinical LAPIS                                                                        |

## The over-time queries: why they're a fan-out, not one call

`gs-mutations-over-time` and `gs-queries-over-time` used to be a single LAPIS
`/component/...OverTime` call each, aggregated server-side. SILO has no such
endpoint, and — this was measured, not assumed — batching every
position/mutation into one `unionAll` query doesn't scale: putting the
grouping tag _inside_ `groupBy` hits a hard cliff (0.36s → 60s+ timeout for a
single extra branch). Moving the tag _after_ `groupBy` avoids the cliff, but
`unionAll` branches run **serially** on SILO, so a 20-position batch (~3.4s)
is slower than 20 parallel single-position requests (~0.38s). Amino-acid
coverage additionally can't be expressed in SaneQL at all
(`!aminoAcidEquals(19,'X')` over-counts nulls).

What shipped instead, for both over-time grids:

- **All date filtering goes through the dictionary-encoded date column**, not
  the `DATE32` sampling-date column — a plain string comparison instead of a
  cast, and the difference between sub-second and multi-second queries.
  `SiloSchema.groupingDateIsDictionary` per organism picks the right column
  (`src/dataLayer/queries/filter.ts`, `src/config/siloSchema.ts`). Covid has
  one; **RSV does not** — see "Known gaps" below.
- **A per-position/per-query fan-out**, not one aggregate call: one cheap
  `groupBy(count(), {date})` for the metadata/day-bucket axis, then one
  parallel request per visible grid position or query, fanned out through
  `useQueries` with `staleTime: Infinity` so paging/filtering never re-fetches
  a position already in hand. Client-side code folds the results into the
  count/coverage matrix the grid renders.
- The grid is **server-paginated** — only the positions on the current page
  are ever fetched.

Full derivation and the measured numbers this rests on used to live in a
dedicated findings doc; if you're about to change the over-time query shape,
re-derive rather than trust old numbers — SILO's own performance on this
shape is exactly what's being tracked as an open issue (see `ROADMAP.md`).

## Known gaps (not bugs)

- **RSV mutations-/queries-over-time is broken.** rsv-a/rsv-b have no
  dictionary-encoded date column, only a `DATE32` sampling-date column, and
  grouping by it times out even for a single position. An `ErrorBoundary`
  catches the resulting 504. Fix is upstream (SILO `DATE32` grouping speed) —
  tracked in `ROADMAP.md`, not worked around client-side on purpose (keeps
  the code simple; covid works today).
- **Lineage filter and advanced-query parsing stay on LAPIS.** Not a
  migration gap — there's no SILO equivalent to move to yet (see table
  above).

## Cross-origin isolation (relevant once the WASM build lands)

`@rhydb/rhydb-wasm` uses pthreads, which requires the page to be served with:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Not yet wired up (no WASM build in the app yet — see ROADMAP phase 7), but
every cross-origin subresource the app loads (fonts, images, CDN scripts) will
need to already send compatible CORS/CORP headers once it is, or it breaks
silently. Decide then whether the whole app runs isolated, or the in-browser-
SILO mode gets a separate entry point/bundle.

## Config strategy

`public/config.json`, fetched once at startup and zod-validated
(`src/config/`), carries per-organism settings: SILO coordinates, clinical
LAPIS URLs, collections backend, which analysis modes are enabled, filter
defaults. One build artifact serves every environment by swapping
`config.json` — no environment variables baked into the bundle. No config
present is a valid, deliberate state (empty app, not a hardcoded default) —
this is also the seam a future "point at another SILO" / "upload your own
data" entry plugs into (`?silo=` override + settings panel + `localStorage`,
following `wastewater-analytics-experiment`'s `src/data/instance.tsx` —
ROADMAP phase 6).

## Testing

Two Vitest projects:

- **`node`** — plain unit tests (page-state handlers, data-hook logic).
- **`browser`** — Playwright-driven, for `*.browser.spec.tsx` component
  tests (filter panels, the over-time grids' rendering). This is why the repo
  carries the full dashboards Vitest setup (MSW + `routeMocker.ts` +
  `@testing-library/*` + `vitest-browser-react`) rather than the lighter
  plain-`vitest run` setup the sibling `wastewater-analytics-experiment` repo
  uses — that setup can't run component tests at all.

`vitest-browser-react` is pinned to `1.0.1` — 2.x makes `render()` async,
which breaks the ported specs.

## Review / commit discipline

This codebase absorbed large amounts of known-good code moved from
`dashboards` and `dashboard-components` with minimal changes. The convention,
still worth following for future large changes:

1. **Verbatim copy** — files land with structure preserved, no edits beyond
   what's needed to compile.
2. **Mechanical rewrite** — import-path updates, renames, tool-assisted and
   uniform, its own commit.
3. **Semantic change** — new glue, wiring, actual behavior changes. Small,
   because everything else was pulled into (1)/(2), and it's the only part
   that needs real review.

Never prune "unused" code inside a move commit (that's a deletion _decision_,
review it separately later once coverage shows what's reachable), and never
fold a behavior change into a move (e.g. a caching-semantics change belongs
in its own commit even if it touches the same files a move touched).

## Related repos

- **`wastewater-analytics-experiment`** — the architectural reference for the
  SILO client: `src/rhydb/` (SaneQL AST builder + HTTP client, concurrency
  limits, retry, typed errors), `src/data/instance.tsx` (runtime instance
  selection), and the fan-out/streaming infrastructure the over-time views
  are adapted from. Worth diffing against when SILO's query capabilities
  change.
- **`dashboards`** (`GenSpectrum/dashboards`) — the Astro app this was
  extracted from. Still owns the WISE RSV/Influenza pages (out of scope
  here) and the other, non-wastewater parts of the site.
- **`dashboard-components`** — the component library `src/components/` was
  hard-forked from (vendored, ported Preact→React, no upstream tracking).
  Pulling in an upstream fix means re-porting it by hand, not a version bump.

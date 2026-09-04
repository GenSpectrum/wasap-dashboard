# Vendored from @genspectrum/dashboard-components

This directory is a **hard fork** of the parts of
[`@genspectrum/dashboard-components`](https://github.com/GenSpectrum/dashboard-components)
that the wastewater (W-ASAP) dashboards use. We do not track upstream — see
`standalone-wasap/03-step-2-inline-dashboard-components.md` ("DECIDED — hard fork,
no upstream tracking") for the rationale. This file records provenance for
archaeology only.

## Origin

- Package: `@genspectrum/dashboard-components@1.19.0` (the version `wasap-standalone`
  had installed at the time of the fork).
- Vendored from the **published npm package's `src/`**, not the `dashboard-components`
  git history: the local mirror of that repo (`~/repos/dashboard-components.git`)
  was pinned at `1.18.1` (commit `8a1e32e`), one release behind what was actually
  resolved into `node_modules`. Using the npm package's source guarantees this vendor
  matches the code that was actually running, at the cost of not having a git SHA to
  point at. A diff against the `1.18.1` git tree showed the only changes touching
  this closure were the `1.19.0` "mutation cooccurrence" feature, which isn't used
  here.
- Diffing `node_modules/@genspectrum/dashboard-components@1.19.0/src` against a clone
  of `~/repos/dashboard-components.git` at `8a1e32e` confirms every file below is
  byte-identical to that commit except: `features-over-time-grid.tsx`,
  `mutations-over-time.tsx`, `mutations-over-time-grid-tooltip.tsx`,
  `queries-over-time.tsx`, `queries-over-time-grid-tooltip.tsx`,
  `getFilteredQueriesOverTimeData.ts`, `useMutationsOverTimePageData.ts`,
  `queryMutationsOverTime.ts` (all touched by the mutation-cooccurrence feature, but
  the diffs are additive — new optional params/branches).

## What was taken

The transitive import closure of the 9 web components the wastewater dashboards
render: `gs-app`, `gs-mutations-over-time`, `gs-queries-over-time`,
`gs-date-range-filter`, `gs-lineage-filter`, `gs-location-filter`,
`gs-mutation-filter`, `gs-number-range-filter`, `gs-text-filter` — plus the handful
of `.spec.ts` files in the closure whose own imports stay inside it (the
framework-agnostic `operator`/`utils` specs, and a few pure-logic `preact/**` specs).
124 source files + 15 spec files, copied byte-for-byte from
`node_modules/@genspectrum/dashboard-components/src/`, same relative paths.

Not taken: anything reachable only through `utilEntrypoint.ts` re-exporting from
components the wasap dashboards don't render (aggregate, mutations grid, prevalence
over time, relative growth advantage, statistics, sequences-by-location/leaflet,
genome viewer, mutation comparison, mutation cooccurrence, …), their Storybook
stories, and the Lit `.mdx` docs.

## Local modifications

**None yet** — this commit is a verbatim copy; the code still imports `preact`,
`lit`, `@lit/*` and will not build until the following commits port it to React and
replace the Lit web-component layer. See the commit series on this branch and
`standalone-wasap/03-step-2-inline-dashboard-components.md` for what changes and why.

# `components/data/` — SILO data-hook layer

Grows into the layer that sits between `components/rhydb/` (the SILO transport)
and the React components: the connection context, the TanStack-Query hooks, and
the fan-out helpers. Step 3, see
`standalone-wasap/04-step-3-native-silo-queries.md`.

## Vendored (from `wastewater-analytics-experiment/src/data/**`)

- `pool.ts` — bounded parallel execution, abort-on-first-failure. Byte-for-byte.
- `streaming.ts` — `useStreamedResults` / `useStreamedPrefix`: fan out one request
  per item (per position, per mutation), publish partial results on a timer,
  cache the completed result in TanStack Query. Byte-for-byte; imports
  `../rhydb/query` for `RhydbError`.

Only change from upstream: `*.test.ts` → `*.spec.ts`.

The fan-out path (`streaming.ts`) is the **fallback** for the over-time queries if
[GenSpectrum/LAPIS#1835](https://github.com/GenSpectrum/LAPIS/issues/1835)'s
`unionAll` batching doesn't hold against the W-ASAP SILO — measured in phase 4.
Vendored now because it is needed either way (other fan-out queries, and as the
fallback).

## Built here (not vendored)

The connection provider + `useConnection`, the query catalogue's hooks, and the
minimal-LAPIS-client hook for the lineage island — added in the following commits.

# `components/rhydb/` — vendored SaneQL / SILO query layer

Copied from `wastewater-analytics-experiment` (`~/repos/wastewater-analytics-experiment.git`,
`src/rhydb/**`) as the starting point for step 3 — reading the wastewater data
from native SILO SaneQL instead of LAPIS. See
`standalone-wasap/04-step-3-native-silo-queries.md`.

## What was taken

`connection.ts`, `escape.ts`, `expression.ts`, `functions.ts`, `query.ts`,
`relation.ts`, `requestLimit.ts`, `row.ts` and their unit tests — byte-for-byte,
same relative paths. The import closure is entirely self-contained (no import
reaches outside this directory).

Not taken: `live.test.ts` — an opt-in (`RUN_LIVE=1`) integration test wired to the
experiment repo's own instance URLs.

## Local modifications

- `*.test.ts` → `*.spec.ts`, to match the test-file naming used everywhere else
  in `components/` and `src/`. No content change.
- `expression.ts`: added `dateLiteral(value)` → `'yyyy-mm-dd'::date`. The W-ASAP
  instances filter dates on the `samplingDate` (`DATE32`) column — a bare string
  in that comparison is rejected, the `::date` cast is not. The experiment repo
  sidesteps this by filtering on a dictionary-encoded `date` column instead, which
  rsv-a / rsv-b do not have.

Nothing consumes this yet — the connection provider, the query catalogue and the
data-hook layer that sit on top are built in the following commits.

## Naming

The upstream calls the backend "RhyDB"; here it is SILO (the same thing — RhyDB is
the query engine, SILO the service that embeds it). The `Rhydb*` type names are
kept as-is for now to keep the diff against upstream legible; a rename can come
later if it earns its churn.

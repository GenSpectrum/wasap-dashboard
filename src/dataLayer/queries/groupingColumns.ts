import { field, type Expr } from '../transport/expression';

/**
 * `{<column> := <column>, …}`: grouping columns re-assigned to themselves, for the `map()` in front
 * of a `group` that also groups by a `<seq>.at(<pos>)` column.
 *
 * RhyDB 0.15 answers `group(by := {<date>, sym})` with a fast bitmap aggregation only if it can
 * match every grouping column. A position (`sym := main.at(…)`) and a dictionary-encoded column
 * match, but a plain scan column like rsv-a / rsv-b's `DATE32` `samplingDate` does not. One
 * unmatched column sends the query to the generic path, which decompresses every read, and on
 * rsv-a that runs into the proxy's 60 s timeout. A column that the `map()` produces as a bare field
 * reference does match (~0.3 s for the same query).
 *
 * TODO: remove this workaround once RhyDB's aggregation rewrite also matches plain scan columns.
 */
export function groupingColumnsPassThrough(columns: readonly string[]): Record<string, Expr> {
    return Object.fromEntries(columns.map((column) => [column, field(column)]));
}

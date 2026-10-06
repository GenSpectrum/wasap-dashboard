/**
 * The symbol every read in scope carries at each of several positions, per sample and sampling
 * date: base counts per sample, which is what a deconvolution starts from (the frequency of a
 * mutation in a sample is the count of its base over the count of all bases and deletions).
 *
 * ## What the query does
 *
 * A joint symbols query (`jointSymbolsQuery`): one column per position, grouped by sample, date and
 * all of the positions at once. A deconvolution only needs each position on its own (the
 * marginals), so `readSymbolsBySample` sums the joint counts over the other positions — exactly
 * what one query per position would have returned (checked live).
 *
 * ## Why batched
 *
 * Measured on covid, Zürich, 90 days, the 92 positions of a 4-lineage panel (24 requests at once):
 *
 * | positions per query | queries | wall time | response |
 * | ------------------- | ------- | --------- | -------- |
 * | 1                   | 92      | 3.8 s     | 0.4 MB   |
 * | 12                  | 8       | 1.1 s     | 0.8 MB   |
 * | 92                  | 1       | 1.8 s     | 5.0 MB   |
 *
 * Each query costs SILO about the same, whether it maps one position or a dozen, so fewer queries
 * are faster. But every row repeats every column (mostly `N`), so a single query for all positions
 * gets big and slower again; `POSITIONS_PER_QUERY` is the sweet spot in between.
 *
 * ## What one could do instead
 *
 * - **One query per position** (`positions` of length 1): the simplest, each response is exactly
 *   the base counts of its position, nothing to sum — about 3.5× slower for a typical panel.
 * - **A base-count action in SILO**: per sample, the count of each symbol at a list of positions,
 *   computed in one pass without the joint distribution. One small query, no batching, no
 *   summing — the cleanest, but SILO has no such action today (`mutations()` can't be grouped
 *   by sample).
 * - **Fetch the location's whole history once, filter dates in the browser**: changing the date
 *   range would then cost no queries at all. Independent of the batching.
 */

import { type SiloReadFilter } from './filter';
import { jointSymbolsQuery, positionColumn } from './jointSymbols';
import type { SiloSchema } from './schema';
import { type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

/** How many positions one query maps (see above). */
export const POSITIONS_PER_QUERY = 12;

/** A joint symbols query (`jointSymbolsQuery`) by sample and date. */
export function symbolsBySampleQuery(
    schema: SiloSchema,
    filter: SiloReadFilter,
    sequenceName: string,
    positions: readonly number[],
): Relation {
    return jointSymbolsQuery(schema, filter, sequenceName, positions, [schema.sampleId, schema.groupingDate]);
}

export type SymbolsBySampleRow = {
    sampleId: string;
    /** ISO `yyyy-mm-dd`. */
    date: string;
    /** The symbol at the position: a base, `-`, `N`, or `null` (absent). */
    sym: string | null;
    count: number;
};

/** The base counts of each position on its own: the joint counts, summed over the other positions. */
export function readSymbolsBySample(
    rows: readonly RhydbRow[],
    schema: SiloSchema,
    positions: readonly number[],
): Map<number, SymbolsBySampleRow[]> {
    return new Map(
        positions.map((position) => {
            const column = positionColumn(position);
            const marginal = new Map<string, SymbolsBySampleRow>();
            for (const row of rows) {
                const sampleId = readText(row, schema.sampleId);
                const sym = readOptionalText(row, column);
                const key = `${sampleId}\u0000${sym}`;
                const entry = marginal.get(key);
                if (entry === undefined) {
                    marginal.set(key, {
                        sampleId,
                        date: readText(row, schema.groupingDate),
                        sym,
                        count: readCount(row, 'count'),
                    });
                } else {
                    entry.count += readCount(row, 'count');
                }
            }
            return [position, [...marginal.values()]];
        }),
    );
}

/**
 * The symbols each read carries at several positions at once, counted by some grouping columns:
 * the *joint* distribution of the symbols at the positions,
 *
 * ```
 * filter(<scope>)
 *   .map({p241 := main.at(241), p670 := main.at(670), …})
 *   .groupBy({count := count()}, {<grouping columns>, p241, p670, …})
 * ```
 *
 * The amplicon co-occurrence reads it as it is (which mutations are on one read, by date); the
 * deconvolution sums it into each position on its own (base counts, by sample).
 *
 * It stays small because the reads are short amplicons (a few hundred bases): a read covers one or
 * two of positions spread over the genome and is `N` at all the others, so the rows grow with the
 * number of positions, not with the number of combinations of symbols. Grouping columns are named
 * bare (`{date, p241, …}`), not reassigned inline, for the same reason as in
 * `positionOverTimeQuery`: the older SILO version behind rsv-a / rsv-b rejects an inline `:=` in a
 * `groupBy` column list.
 */

import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';
import { field } from '../transport/expression';
import { count } from '../transport/functions';
import { type Relation } from '../transport/relation';

/** The name of a position's symbol column in a joint symbols query. */
export function positionColumn(position: number): string {
    return `p${position}`;
}

export function jointSymbolsQuery(
    schema: SiloSchema,
    filter: SiloReadFilter,
    sequenceName: string,
    positions: readonly number[],
    groupBy: readonly string[],
): Relation {
    return scoped(schema, filter)
        .map(
            Object.fromEntries(
                positions.map((position) => [positionColumn(position), field(sequenceName).at(position)]),
            ),
        )
        .groupBy({ count: count() }, [...groupBy, ...positions.map(positionColumn)]);
}

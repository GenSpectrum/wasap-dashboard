/**
 * The joint symbol distribution across several positions, per day — one column mapped per
 * position, grouped by all of them plus the date. Unlike `mutationsOverTime.ts`'s one-query-per-
 * position marginal distribution, co-occurrence needs the *joint* one, so this is a single query.
 * Verified live: sub-second up to 10 positions against covid (~600M reads) and rsv-a (~17M).
 *
 * Grouping columns are named bare (`{date, sym0, sym1, ...}`), not reassigned inline: the older
 * SILO version behind rsv-a/rsv-b rejects an inline `:=` in a `group` column list.
 */

import { scoped, type RhydbReadFilter } from './filter';
import { type PositionTarget } from './mutationsOverTime';
import type { RhydbSchema } from './schema';
import { field } from '../transport/expression';
import { count } from '../transport/functions';
import { type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

/** The mapped symbol column for the position at this index in the target list. */
function symColumn(index: number): string {
    return `sym${index}`;
}

export function positionsCooccurrenceQuery(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    targets: readonly PositionTarget[],
): Relation {
    const assignments = Object.fromEntries(
        targets.map((target, index) => [symColumn(index), field(target.sequenceName).at(target.position)]),
    );
    return scoped(schema, filter)
        .map(assignments)
        .group({ count: count() }, [schema.groupingDate, ...targets.map((_target, index) => symColumn(index))]);
}

export type CooccurrenceRow = {
    /** ISO `yyyy-mm-dd`. */
    date: string;
    /** The symbol at each target, index-aligned with the `targets` the query was built with; `null` = absent. */
    symbols: (string | null)[];
    count: number;
};

export function readCooccurrenceRows(
    rows: readonly RhydbRow[],
    dateColumn: string,
    targets: readonly PositionTarget[],
): CooccurrenceRow[] {
    return rows.map((row) => ({
        date: readText(row, dateColumn),
        symbols: targets.map((_target, index) => readOptionalText(row, symColumn(index))),
        count: readCount(row, 'count'),
    }));
}

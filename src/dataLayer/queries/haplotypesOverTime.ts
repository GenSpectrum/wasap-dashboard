/**
 * The symbols each read carries at several positions at once, per day: which combinations of
 * mutations occur together on one read. Backs the amplicon co-occurrence, one query per amplicon
 * with its mutations' positions.
 *
 * A joint symbols query (`jointSymbolsQuery`) by date, scoped to the location only: the whole date
 * range comes back and is bucketed client-side. A few hundred ms for three positions on a
 * location's data (covid, Zürich).
 */

import type { SiloReadFilter } from './filter';
import { jointSymbolsQuery, positionColumn } from './jointSymbols';
import type { SiloSchema } from './schema';
import { type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

export function haplotypesOverTimeQuery(
    schema: SiloSchema,
    filter: Pick<SiloReadFilter, 'locationName'>,
    sequenceName: string,
    positions: readonly number[],
): Relation {
    return jointSymbolsQuery(schema, { locationName: filter.locationName }, sequenceName, positions, [
        schema.groupingDate,
    ]);
}

export type HaplotypeOverTimeRow = {
    /** ISO `yyyy-mm-dd`. */
    date: string;
    /** The symbol at each of the positions, in their order: a base, `-`, `N`, or `null` (absent). */
    symbols: (string | null)[];
    count: number;
};

export function readHaplotypesOverTime(
    rows: readonly RhydbRow[],
    dateColumn: string,
    positions: readonly number[],
): HaplotypeOverTimeRow[] {
    return rows.map((row) => ({
        date: readText(row, dateColumn),
        symbols: positions.map((position) => readOptionalText(row, positionColumn(position))),
        count: readCount(row, 'count'),
    }));
}

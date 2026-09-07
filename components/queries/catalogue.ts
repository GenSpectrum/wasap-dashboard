/**
 * The SILO SaneQL queries the wastewater components send.
 *
 * Each is a builder returning a `Relation` (renderable query text). The exact
 * text of each is pinned in `__snapshots__/catalogue.sanql`, so a change to how
 * one is built arrives as a diff of that file.
 *
 * Grows as components move off LAPIS. Started with the Tier-1 reads (doc 04,
 * sub-phase 2): each a single `groupBy(count(), …)`.
 */

import { count } from '../rhydb/functions';
import { field, type Expr } from '../rhydb/expression';
import { table, type Relation } from '../rhydb/relation';
import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';

/** The aggregate every counting query names. */
export const READS = 'n';

function readCounts(): Record<string, Expr> {
    return { [READS]: count() };
}

/** Total reads the filter admits — one row, `{ n }`. */
export function totalReadCountQuery(schema: SiloSchema, filter: SiloReadFilter = {}): Relation {
    return scoped(schema, filter).groupBy(readCounts());
}

/**
 * Every distinct value of a string column, with its read count.
 *
 * Unfiltered — a filter dropdown offers every value the instance holds.
 * Grouping a dictionary/indexed column is close to free. Used for the sampling
 * location list; `field` must name a dictionary or indexed string column.
 */
export function stringFieldValuesQuery(schema: SiloSchema, field: string): Relation {
    return table(schema.table).groupBy(readCounts(), [field]);
}

/**
 * Every distinct sampling date in the dataset (oldest first), with its read
 * count, grouped on the dictionary-encoded date column where the instance has
 * one. The date extent is the first and last row; the caller reads min/max off
 * the sorted result rather than paying for two queries.
 */
export function samplingDatesQuery(schema: SiloSchema, filter: SiloReadFilter = {}): Relation {
    return scoped(schema, filter)
        .groupBy(readCounts(), [schema.groupingDate])
        .orderBy(field(schema.groupingDate).asc());
}

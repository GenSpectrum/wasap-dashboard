/**
 * The SILO SaneQL queries the wastewater components send.
 *
 * Each is a builder returning a `Relation` (renderable query text); the
 * rendered text of each is asserted in `catalogue.spec.ts`. Grows as components
 * move off LAPIS — started with the Tier-1 reads (doc 04, sub-phase 2), each a
 * single `groupBy(count(), …)`.
 */

import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';
import { field, type Expr } from '../transport/expression';
import { count } from '../transport/functions';
import { table, type Relation } from '../transport/relation';

/** The aggregate every counting query names. */
export const READS = 'n';

function readCounts(): Record<string, Expr> {
    return { [READS]: count() };
}

/**
 * Total reads the filter admits — one row per location; sum them for the total.
 *
 * A bare `groupBy({n := count()})` with no grouping columns hits a SILO
 * performance bug and can take tens of seconds even on a filtered query.
 * Grouping by the location column instead stays fast (it's dictionary-encoded
 * and low-cardinality — "close to free", per stringFieldValuesQuery below),
 * and summing the handful of rows client-side (readTotalCount) gives the same
 * total.
 */
export function totalReadCountQuery(schema: SiloSchema, filter: SiloReadFilter = {}): Relation {
    return scoped(schema, filter).groupBy(readCounts(), [schema.locationName]);
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

/**
 * How a wastewater RhyDB read is scoped, and the SaneQL predicate that scopes it.
 *
 * `RhydbReadFilter` is the one description of "which reads" the queries take.
 * wasap only ever narrows the wastewater dataset by sampling location and a
 * sampling-date window, so it is a small, closed record.
 */

import z from 'zod';

import type { RhydbSchema } from './schema';
import { and, dateLiteral, field, str, type Expr } from '../transport/expression';
import { table, type Relation } from '../transport/relation';

export const rhydbReadFilterSchema = z.object({
    /**
     * The locations whose reads are pooled, matched exactly on the location-name column. Absent
     * means every location; never empty, which would match nothing.
     */
    locationNames: z.array(z.string()).nonempty().optional(),
    /** Inclusive lower bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateFrom: z.string().optional(),
    /** Inclusive upper bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateTo: z.string().optional(),
});

export type RhydbReadFilter = z.infer<typeof rhydbReadFilterSchema>;

/**
 * The same filter written the same way every time.
 *
 * A TanStack query key hashes an object by its own key order, and the rendered
 * query text has to be deterministic, so the fields are copied in a fixed
 * order and nothing `undefined` is carried.
 */
export function normalizeFilter(filter: RhydbReadFilter): RhydbReadFilter {
    const normalized: RhydbReadFilter = {};
    if (filter.locationNames !== undefined) {
        // A set: the order it was picked in doesn't change the reads.
        const [first, ...rest] = [...new Set(filter.locationNames)].sort();
        normalized.locationNames = [first, ...rest];
    }
    if (filter.samplingDateFrom !== undefined) {
        normalized.samplingDateFrom = filter.samplingDateFrom;
    }
    if (filter.samplingDateTo !== undefined) {
        normalized.samplingDateTo = filter.samplingDateTo;
    }
    return normalized;
}

/**
 * The whole scope as one predicate, or `undefined` where the filter narrows
 * nothing.
 *
 * Order is fixed — location, then the date bounds — so the same scope always
 * renders the same text. Date bounds compare against the `DATE32`
 * `samplingDate` column with a `::date` cast.
 */
export function filterExpression(schema: RhydbSchema, filter: RhydbReadFilter): Expr | undefined {
    return and(locationExpression(schema, filter.locationNames), dateRangeExpression(schema, filter));
}

/**
 * The date bounds of a filter on its own, or `undefined` without any. Against `column` when the
 * dates are in a column of another name (one `map()`-ed from `samplingDate`), else `samplingDate`.
 */
export function dateRangeExpression(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    column: string = schema.samplingDate,
): Expr | undefined {
    return and(
        filter.samplingDateFrom === undefined ? undefined : field(column).gte(dateLiteral(filter.samplingDateFrom)),
        filter.samplingDateTo === undefined ? undefined : field(column).lte(dateLiteral(filter.samplingDateTo)),
    );
}

/** One location as a plain comparison, as before there could be several. */
function locationExpression(schema: RhydbSchema, locationNames: RhydbReadFilter['locationNames']): Expr | undefined {
    if (locationNames === undefined) {
        return undefined;
    }
    const column = field(schema.locationName);
    return locationNames.length === 1 ? column.eq(str(locationNames[0])) : column.isIn(locationNames.map(str));
}

/**
 * The table, narrowed to the reads a filter admits, plus any extra predicate
 * the caller needs on top. Where every query starts; an unnarrowed
 * table stays bare.
 */
export function scoped(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    ...extra: readonly (Expr | undefined)[]
): Relation {
    return table(schema.table).filter(and(filterExpression(schema, filter), ...extra));
}

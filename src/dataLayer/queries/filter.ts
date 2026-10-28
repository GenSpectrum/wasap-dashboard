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

/**
 * An ISO date as the right-hand side of a comparison against `groupingDate`.
 *
 * The dictionary date column holds an ISO string, so a plain string comparison
 * is both correct (ISO dates sort lexically) and fast — and RhyDB rejects a
 * `::date` cast against it. The `DATE32` column needs the cast. Either way the
 * value is validated here, not at the instance.
 *
 * TODO: this function should not exist. It is here only for the transition
 * period where covid has a dictionary `date` column and rsv-a / rsv-b do not
 * (see `RhydbSchema.groupingDateIsDictionary`). Once every instance has one,
 * every date bound is a plain `str(value)` against the dict column and this
 * collapses back into `filterExpression`.
 */
function dateComparand(schema: RhydbSchema, value: string): Expr {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`Not an ISO date (yyyy-mm-dd): ${JSON.stringify(value)}`);
    }
    return schema.groupingDateIsDictionary ? str(value) : dateLiteral(value);
}

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
 * renders the same text. Date bounds compare against `groupingDate`: the
 * dictionary date column where the instance has one (a plain, cheap string
 * comparison), otherwise the `DATE32` column with a `::date` cast.
 */
export function filterExpression(schema: RhydbSchema, filter: RhydbReadFilter): Expr | undefined {
    return and(locationExpression(schema, filter.locationNames), dateRangeExpression(schema, filter));
}

/**
 * The date bounds of a filter on its own, or `undefined` without any. Against `column` when the
 * dates are in a column of another name (one `map()`-ed from `groupingDate`), else `groupingDate`.
 */
export function dateRangeExpression(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    column: string = schema.groupingDate,
): Expr | undefined {
    return and(
        filter.samplingDateFrom === undefined
            ? undefined
            : field(column).gte(dateComparand(schema, filter.samplingDateFrom)),
        filter.samplingDateTo === undefined
            ? undefined
            : field(column).lte(dateComparand(schema, filter.samplingDateTo)),
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

/**
 * How a wastewater SILO read is scoped, and the SaneQL predicate that scopes it.
 *
 * `SiloReadFilter` is the one description of "which reads" the catalogue speaks
 * — the purpose-built replacement for the flat `LapisFilter` the components
 * used to take as a prop. wasap only ever narrows the wastewater dataset by
 * sampling location and a sampling-date window, so it is a small, closed record
 * (see doc 04, "The `SiloReadFilter`").
 */

import z from 'zod';

import { and, dateLiteral, field, str, type Expr } from '../rhydb/expression';
import { table, type Relation } from '../rhydb/relation';
import type { SiloSchema } from './schema';

/**
 * An ISO date as the right-hand side of a comparison against `groupingDate`.
 *
 * The dictionary date column holds an ISO string, so a plain string comparison
 * is both correct (ISO dates sort lexically) and fast — and SILO rejects a
 * `::date` cast against it. The `DATE32` column needs the cast. Either way the
 * value is validated here, not at the instance.
 *
 * TODO: this function should not exist. It is here only for the transition
 * period where covid has a dictionary `date` column and rsv-a / rsv-b do not
 * (see `SiloSchema.groupingDateIsDictionary`). Once every instance has one,
 * every date bound is a plain `str(value)` against the dict column and this
 * collapses back into `filterExpression`.
 */
function dateComparand(schema: SiloSchema, value: string): Expr {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`Not an ISO date (yyyy-mm-dd): ${JSON.stringify(value)}`);
    }
    return schema.groupingDateIsDictionary ? str(value) : dateLiteral(value);
}

export const siloReadFilterSchema = z.object({
    /** Exact match on the location-name column. */
    locationName: z.string().optional(),
    /** Inclusive lower bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateFrom: z.string().optional(),
    /** Inclusive upper bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateTo: z.string().optional(),
});

export type SiloReadFilter = z.infer<typeof siloReadFilterSchema>;

/**
 * The same filter written the same way every time.
 *
 * A TanStack query key hashes an object by its own key order, and the rendered
 * query text has to be deterministic, so the fields are copied in a fixed
 * order and nothing `undefined` is carried.
 */
export function normalizeFilter(filter: SiloReadFilter): SiloReadFilter {
    const normalized: SiloReadFilter = {};
    if (filter.locationName !== undefined) {
        normalized.locationName = filter.locationName;
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
export function filterExpression(schema: SiloSchema, filter: SiloReadFilter): Expr | undefined {
    return and(
        filter.locationName === undefined ? undefined : field(schema.locationName).eq(str(filter.locationName)),
        filter.samplingDateFrom === undefined
            ? undefined
            : field(schema.groupingDate).gte(dateComparand(schema, filter.samplingDateFrom)),
        filter.samplingDateTo === undefined
            ? undefined
            : field(schema.groupingDate).lte(dateComparand(schema, filter.samplingDateTo)),
    );
}

/**
 * The table, narrowed to the reads a filter admits, plus any extra predicate
 * the caller needs on top. Where every catalogue query starts; an unnarrowed
 * table stays bare.
 */
export function scoped(schema: SiloSchema, filter: SiloReadFilter, ...extra: readonly (Expr | undefined)[]): Relation {
    return table(schema.table).filter(and(filterExpression(schema, filter), ...extra));
}

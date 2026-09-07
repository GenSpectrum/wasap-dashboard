/**
 * How a wastewater SILO read is scoped, and the SaneQL predicate that scopes it.
 *
 * `SiloReadFilter` is the one description of "which reads" the catalogue speaks
 * — the purpose-built replacement for the flat `LapisFilter` the vendored
 * components used to take as a prop. wasap only ever narrows the wastewater
 * dataset by sampling location and a sampling-date window, so it is a small,
 * closed record (see doc 04, "The `SiloReadFilter`").
 */

import { and, dateLiteral, field, str, type Expr } from '../rhydb/expression';
import { table, type Relation } from '../rhydb/relation';
import type { SiloSchema } from './schema';

export type SiloReadFilter = {
    /** Exact match on the location-name column. */
    locationName?: string;
    /** Inclusive lower bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateFrom?: string;
    /** Inclusive upper bound on the sampling date, ISO `yyyy-mm-dd`. */
    samplingDateTo?: string;
};

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
 * renders the same text.
 */
export function filterExpression(schema: SiloSchema, filter: SiloReadFilter): Expr | undefined {
    return and(
        filter.locationName === undefined ? undefined : field(schema.locationName).eq(str(filter.locationName)),
        filter.samplingDateFrom === undefined
            ? undefined
            : field(schema.samplingDate).gte(dateLiteral(filter.samplingDateFrom)),
        filter.samplingDateTo === undefined
            ? undefined
            : field(schema.samplingDate).lte(dateLiteral(filter.samplingDateTo)),
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

/**
 * The data of the queries-over-time grid.
 *
 * One hook. The date axis (buckets + per-bucket read totals) is one query; each
 * of the collection's queries is two more — a count and a coverage
 * (`q || !maybe(q)`) — grouped by the raw date column and bucketed client-side,
 * so a granularity change re-folds without re-fetching. Cached per query
 * (`staleTime: Infinity`), keyed by the rendered SaneQL, so revisiting a
 * collection reuses whatever is already in hand. The proportion matrix is a
 * pure function of the folded counts (`buildQueriesMatrix`).
 */

import { useMemo } from 'react';

import { type ProportionValue } from '../../../components/overTime/proportionValue';
import { type TemporalGranularity } from '../../../types/dashboardComponents';
import { type Map2DContents } from '../../../util/map2d';
import { parseDateStringToTemporal, type Temporal, type TemporalClass } from '../../../util/temporalClass';
import {
    countOverTimeQuery,
    coverageOverTimeQuery,
    normalizeFilter,
    type RhydbFilterExpression,
    type RhydbReadFilter,
} from '../../queries';
import { readNamedCounts, type NamedCount } from '../../queries/rows';
import { allQueryData } from '../allQueryData';
import { useConnection, useRhydbSchema } from '../connection';
import { useDateAxis } from '../lookups/dateAxis';
import { useRhydbQueries } from '../rhydbQuery';

/** What the hook needs of a collection query: a grid-row label and the genome-only expression. */
type QuerySpec = { displayLabel: string; filter: RhydbFilterExpression };

export type QueriesOverTimeData = {
    /** Queries × dates → count/coverage/proportion, or `null` while anything is still loading. */
    data: Map2DContents<string, Temporal, ProportionValue> | null;
    isLoading: boolean;
    error: unknown;
};

/** Raw daily `{ date, n }` counts for one query, before bucketing. */
type QueryDailyCounts = { count: NamedCount[]; coverage: NamedCount[] };

export function useQueriesOverTime(
    filter: RhydbReadFilter,
    granularity: TemporalGranularity,
    queries: readonly QuerySpec[],
): QueriesOverTimeData {
    const connection = useConnection();
    const schema = useRhydbSchema();
    const normalized = normalizeFilter(filter);

    const axis = useDateAxis(filter, granularity);

    const dailyCounts = useRhydbQueries({
        combine: allQueryData<QueryDailyCounts>,
        queries: queries.map((query) => ({
            queryKey: [
                'rhydb',
                'queries-over-time',
                ...connection.key,
                normalized,
                countOverTimeQuery(schema, normalized, query.filter).render(),
            ],
            staleTime: Infinity,
            queryFn: async ({ signal }: { signal: AbortSignal }): Promise<QueryDailyCounts> => {
                const [count, coverage] = await Promise.all([
                    connection
                        .query(
                            countOverTimeQuery(schema, normalized, query.filter),
                            `Queries-over-time count: ${query.displayLabel}`,
                            { signal },
                        )
                        .then((result) => readNamedCounts(result.rows, schema.groupingDate)),
                    connection
                        .query(
                            coverageOverTimeQuery(schema, normalized, query.filter),
                            `Queries-over-time coverage: ${query.displayLabel}`,
                            { signal },
                        )
                        .then((result) => readNamedCounts(result.rows, schema.groupingDate)),
                ]);
                return { count, coverage };
            },
        })),
    });

    const error = axis.error ?? dailyCounts.error;
    const dailyByLabel = useMemo(
        () =>
            dailyCounts.data && new Map(queries.map((query, index) => [query.displayLabel, dailyCounts.data![index]])),
        [queries, dailyCounts.data],
    );

    return useMemo(() => {
        if (error) {
            throw error instanceof Error ? error : new Error(String(error));
        }
        if (axis.data === undefined || dailyByLabel === undefined) {
            return { data: null, isLoading: true, error: undefined };
        }
        const matrix = buildQueriesMatrix(
            queries,
            granularity,
            axis.data.requestedDateRanges,
            axis.data.totalCountsByBucket,
            dailyByLabel,
        );
        return { data: matrix, isLoading: false, error: undefined };
    }, [error, axis.data, queries, granularity, dailyByLabel]);
}

// --- pure matrix assembly (exported for tests) ------------------------------

/**
 * Queries × date buckets → `ProportionValue`, folding each query's raw daily
 * counts into the buckets. A cell is `null` where the bucket has no reads at
 * all, `noCoverage` where it has reads but the query's coverage there is
 * zero, and `value` otherwise — matching the old LAPIS path.
 */
export function buildQueriesMatrix(
    queries: readonly { displayLabel: string }[],
    granularity: TemporalGranularity,
    requestedDateRanges: readonly TemporalClass[],
    totalCountsByBucket: readonly number[],
    dailyByLabel: ReadonlyMap<string, QueryDailyCounts>,
): Map2DContents<string, Temporal, ProportionValue> {
    const bucketIndexByDay = new Map(requestedDateRanges.map((bucket, index) => [bucket.dateString, index]));
    const bucketIndexOf = (day: string): number | undefined =>
        bucketIndexByDay.get(parseDateStringToTemporal(day, granularity).dateString);

    const foldToBuckets = (rows: NamedCount[]): number[] => {
        const byBucket = new Array<number>(requestedDateRanges.length).fill(0);
        for (const { name, count } of rows) {
            const index = bucketIndexOf(name);
            if (index !== undefined) {
                byBucket[index] += count;
            }
        }
        return byBucket;
    };

    return {
        keysFirstAxis: new Map(queries.map((query) => [query.displayLabel, query.displayLabel])),
        keysSecondAxis: new Map(requestedDateRanges.map((bucket) => [bucket.dateString, bucket])),
        data: new Map(
            queries.map((query) => {
                const daily = dailyByLabel.get(query.displayLabel);
                const counts = daily ? foldToBuckets(daily.count) : [];
                const coverages = daily ? foldToBuckets(daily.coverage) : [];
                return [
                    query.displayLabel,
                    new Map(
                        requestedDateRanges.map((bucket, index): [string, ProportionValue] => {
                            // `totalCountsByBucket` is built by mapping over `requestedDateRanges`
                            // (see `buildDateAxis`), so it's always the same length — `index` is
                            // never out of range.
                            const totalCount = totalCountsByBucket[index];
                            if (totalCount === 0) {
                                return [bucket.dateString, null];
                            }
                            const coverage = coverages[index] ?? 0;
                            if (coverage === 0) {
                                return [bucket.dateString, { type: 'noCoverage', totalCount }];
                            }
                            return [
                                bucket.dateString,
                                { type: 'value', count: counts[index] ?? 0, coverage, totalCount },
                            ];
                        }),
                    ),
                ];
            }),
        ),
    };
}

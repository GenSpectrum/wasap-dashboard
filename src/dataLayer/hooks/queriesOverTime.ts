/**
 * `gs-queries-over-time` over SILO.
 *
 * One hook. The date axis (buckets + per-bucket read totals) is one query; each
 * of the collection's queries is two more — a count and a coverage
 * (`q || !maybe(q)`) — grouped by the raw date column and bucketed client-side,
 * so a granularity change re-folds without re-fetching. Cached per query
 * (`staleTime: Infinity`), keyed by the rendered SaneQL, so revisiting a
 * collection reuses whatever is already in hand. The proportion matrix is a
 * pure function of the folded counts (`buildQueriesMatrix`).
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConnection, useSiloSchema } from './connection';
import { buildDateAxis } from './mutationsOverTime';
import { type ProportionValue } from '../../components/dataDisplay/overTime/proportionValue';
import { UserFacingError } from '../../components/shared/error-display';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { type Map2DContents } from '../../util/map2d';
import { parseDateStringToTemporal, type Temporal, type TemporalClass } from '../../util/temporalClass';
import {
    countOverTimeQuery,
    coverageOverTimeQuery,
    normalizeFilter,
    samplingDatesQuery,
    type SiloFilterExpression,
    type SiloReadFilter,
} from '../queries';
import { readNamedCounts, type NamedCount } from '../queries/rows';

/** Above this many date buckets the grid is unreadable and the queries are expensive; refuse it. */
const MAX_GRID_COLUMNS = 200;

/** What the hook needs of a collection query: a grid-row label and the genome-only expression. */
type QuerySpec = { displayLabel: string; filter: SiloFilterExpression };

export type QueriesOverTimeData = {
    /** Queries × dates → count/coverage/proportion, or `null` while anything is still loading. */
    data: Map2DContents<string, Temporal, ProportionValue> | null;
    isLoading: boolean;
    error: unknown;
};

/** Raw daily `{ date, n }` counts for one query, before bucketing. */
type QueryDailyCounts = { count: NamedCount[]; coverage: NamedCount[] };

export function useQueriesOverTime(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    queries: readonly QuerySpec[],
): QueriesOverTimeData {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);

    // `schema` stands in for `connection.key` (same memoized SiloInstance);
    // `normalized` stands in for `filter` — a pure derivation of it,
    // deliberately used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const axis = useQuery({
        queryKey: ['silo', 'queries-over-time-axis', ...connection.key, normalized, granularity],
        queryFn: async ({ signal }) => {
            const dateRows = await connection
                .query(samplingDatesQuery(schema, normalized), 'Queries-over-time date axis', { signal })
                .then((result) => readNamedCounts(result.rows, schema.groupingDate));

            const dateAxis = buildDateAxis(dateRows, granularity, filter);
            if (dateAxis.requestedDateRanges.length > MAX_GRID_COLUMNS) {
                throw new UserFacingError(
                    'Too many dates',
                    `The dataset would contain ${dateAxis.requestedDateRanges.length} date intervals. ` +
                        `Please reduce the number to below ${MAX_GRID_COLUMNS} — narrow the sampling-date filter, ` +
                        'or choose a coarser granularity.',
                );
            }
            return dateAxis;
        },
    });

    const results = useQueries({
        queries: queries.map((query) => ({
            queryKey: [
                'silo',
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

    const error = axis.error ?? results.find((result) => result.error)?.error;
    const answeredSignature = results.map((result) => (result.data === undefined ? 0 : 1)).join('');
    const allAnswered = axis.data !== undefined && !answeredSignature.includes('0');

    const dailyByLabel = useMemo(() => {
        const map = new Map<string, QueryDailyCounts>();
        queries.forEach((query, index) => {
            const daily = results[index]?.data;
            if (daily !== undefined) {
                map.set(query.displayLabel, daily);
            }
        });
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- results identity churns; the signature captures what matters
    }, [queries, answeredSignature]);

    return useMemo(() => {
        if (error) {
            throw error instanceof Error ? error : new Error(String(error));
        }
        // `allAnswered` already implies `axis.data !== undefined` (see its
        // definition above); TS tracks that, so `axis.data` narrows below.
        if (!allAnswered) {
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
    }, [error, allAnswered, axis.data, queries, granularity, dailyByLabel]);
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

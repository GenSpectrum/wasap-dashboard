/**
 * The date axis of a grid over time: its buckets for the filter and granularity, and the reads in
 * each. The reads per date are one RhyDB query, cached apart from the granularity
 * (`samplingDateCountsQuery`), so that all the grids of a page, and of the modes with the same
 * filter, ask for it once, and switching the granularity asks for nothing.
 */

import { queryOptions, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useConnection, useRhydbSchema } from './connection';
import { useRhydbQuery } from './rhydbQuery';
import { UserFacingError } from '../../components/ui/error-display';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import {
    generateAllInRange,
    getMinMaxTemporal,
    parseDateStringToTemporal,
    type TemporalClass,
} from '../../util/temporalClass';
import { normalizeFilter, samplingDatesQuery, type RhydbReadFilter, type RhydbSchema } from '../queries';
import { readNamedCounts, type NamedCount } from '../queries/rows';
import { type Connection } from '../transport/connection';

/** Above this many date buckets the grid is unreadable and the queries are expensive; refuse it. */
export const MAX_GRID_COLUMNS = 200;

export type DateAxis = {
    /** Every bucket in range, gap-filled and sorted. */
    requestedDateRanges: TemporalClass[];
    /** Total reads per bucket, index-aligned with `requestedDateRanges`. */
    totalCountsByBucket: number[];
};

/**
 * The date buckets of a grid for the filter and granularity, and the reads in each. The reads per
 * date come from the cache (`samplingDateCountsQuery`), whatever the granularity, so that the grids
 * of a page ask RhyDB for them once between them.
 */
export async function fetchDateAxis(
    queryClient: QueryClient,
    connection: Connection,
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    granularity: TemporalGranularity,
): Promise<DateAxis> {
    const dateRows = await queryClient.query(samplingDateCountsQuery(connection, schema, normalizeFilter(filter)));
    return toDateAxis(dateRows, granularity, filter);
}

/** The date axis (`fetchDateAxis`) on its own, for a grid of something other than the mutations. */
export function useDateAxis(filter: RhydbReadFilter, granularity: TemporalGranularity): UseQueryResult<DateAxis> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    const normalized = normalizeFilter(filter);

    // Stable, so that the axis is only made again when it changes; an error of `toDateAxis` (too
    // many buckets) becomes the query's. Of the filter, the axis only takes the dates.
    const { samplingDateFrom, samplingDateTo } = normalized;
    const select = useCallback(
        (dateRows: NamedCount[]) => toDateAxis(dateRows, granularity, { samplingDateFrom, samplingDateTo }),
        [granularity, samplingDateFrom, samplingDateTo],
    );
    return useRhydbQuery({ ...samplingDateCountsQuery(connection, schema, normalized), select });
}

/**
 * The query of the reads per sampling date for a (normalized) filter. The buckets of every
 * granularity are made from these, so switching it asks RhyDB for nothing new.
 */
function samplingDateCountsQuery(connection: Connection, schema: RhydbSchema, filter: RhydbReadFilter) {
    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return queryOptions({
        queryKey: ['rhydb', 'sampling-date-counts', ...connection.key, filter],
        staleTime: Infinity,
        queryFn: ({ signal }) =>
            connection
                .query(samplingDatesQuery(schema, filter), 'Over-time date axis', { signal })
                .then((result) => readNamedCounts(result.rows, schema.groupingDate)),
    });
}

/** The date axis of the reads per date; more buckets than a grid can show is an error for the user (`MAX_GRID_COLUMNS`). */
function toDateAxis(dateRows: NamedCount[], granularity: TemporalGranularity, filter: RhydbReadFilter): DateAxis {
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
}

/** The buckets in range and the reads in each (exported for tests). */
export function buildDateAxis(
    dateRows: { name: string; count: number }[],
    granularity: TemporalGranularity,
    filter: RhydbReadFilter,
): DateAxis {
    const countByBucket = new Map<string, number>();
    const bucketByKey = new Map<string, TemporalClass>();
    for (const { name, count } of dateRows) {
        const bucket = parseDateStringToTemporal(name, granularity);
        countByBucket.set(bucket.dateString, (countByBucket.get(bucket.dateString) ?? 0) + count);
        bucketByKey.set(bucket.dateString, bucket);
    }

    const { min, max } = getMinMaxTemporal(bucketByKey.values());
    const from = filter.samplingDateFrom ? parseDateStringToTemporal(filter.samplingDateFrom, granularity) : min;
    const to = filter.samplingDateTo ? parseDateStringToTemporal(filter.samplingDateTo, granularity) : max;

    const requestedDateRanges = generateAllInRange(from, to);
    const totalCountsByBucket = requestedDateRanges.map((bucket) => countByBucket.get(bucket.dateString) ?? 0);
    return { requestedDateRanges, totalCountsByBucket };
}

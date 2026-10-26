/**
 * The date axis of a grid over time: its buckets for the filter and granularity, and the reads in
 * each.
 */

import { type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { useSiloQuery } from './siloQuery';
import { UserFacingError } from '../../components/shared/error-display';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import {
    generateAllInRange,
    getMinMaxTemporal,
    parseDateStringToTemporal,
    type TemporalClass,
} from '../../util/temporalClass';
import { normalizeFilter, samplingDatesQuery, type SiloReadFilter, type SiloSchema } from '../queries';
import { readNamedCounts } from '../queries/rows';
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
 * The date buckets of a grid for the filter and granularity, and the reads in each. More buckets
 * than a grid can show is an error for the user (`MAX_GRID_COLUMNS`).
 */
export async function fetchDateAxis(
    connection: Connection,
    schema: SiloSchema,
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    signal: AbortSignal,
): Promise<DateAxis> {
    const dateRows = await connection
        .query(samplingDatesQuery(schema, normalizeFilter(filter)), 'Over-time date axis', { signal })
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
}

/** The date axis (`fetchDateAxis`) on its own, for a grid of something other than the mutations. */
export function useDateAxis(filter: SiloReadFilter, granularity: TemporalGranularity): UseQueryResult<DateAxis> {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);

    // `schema` stands in for `connection.key` (same memoized SiloInstance); `normalized` for `filter`.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useSiloQuery({
        queryKey: ['silo', 'date-axis', ...connection.key, normalized, granularity],
        queryFn: ({ signal }) => fetchDateAxis(connection, schema, normalized, granularity, signal),
    });
}

/** The buckets in range and the reads in each (exported for tests). */
export function buildDateAxis(
    dateRows: { name: string; count: number }[],
    granularity: TemporalGranularity,
    filter: SiloReadFilter,
): { requestedDateRanges: TemporalClass[]; totalCountsByBucket: number[] } {
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

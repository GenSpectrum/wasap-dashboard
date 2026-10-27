/**
 * `useSampleOverview` — a Tier-1 RhyDB read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useRhydbSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { type UseQueryResult } from '@tanstack/react-query';

import {
    readLocationOverview,
    readSampleOverview,
    sampleOverviewQuery,
    type LocationOverview,
    type SampleOverview,
} from '../../queries';
import { useConnection, useRhydbSchema } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/**
 * Every sample the instance holds, one entry each — its location, sampling date, batch and read
 * count. Used as is by the overview page's samples-over-time plot; `useLocationOverview` reads off
 * the same cached query.
 */
export function useSampleOverview(): UseQueryResult<SampleOverview[]> {
    return useSampleOverviewQuery();
}

/** `useSampleOverview` folded into one entry per location, for the overview page's per-location table. */
export function useLocationOverview(): UseQueryResult<LocationOverview[]> {
    return useSampleOverviewQuery(readLocationOverview);
}

function useSampleOverviewQuery<T = SampleOverview[]>(select?: (samples: SampleOverview[]) => T): UseQueryResult<T> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'sample-overview', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(sampleOverviewQuery(schema), 'Sample overview', { signal });
            return readSampleOverview(rows, schema);
        },
        select,
    });
}

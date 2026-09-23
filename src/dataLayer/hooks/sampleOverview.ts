/**
 * `useSampleOverview` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { readSampleOverview, sampleOverviewQuery, type SampleOverview } from '../queries';

/**
 * Every sample the instance holds, one entry each — its location, sampling date, batch and read
 * count. Shared by the overview page's per-location table (folded with `readLocationOverview`)
 * and its samples-over-time plot (used as is); both read off this same cached query.
 */
export function useSampleOverview(): UseQueryResult<SampleOverview[]> {
    const connection = useConnection();
    const schema = useSiloSchema();
    // `schema` stands in for `connection.key` (same memoized SiloInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'sample-overview', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(sampleOverviewQuery(schema), 'Sample overview', { signal });
            return readSampleOverview(rows, schema);
        },
    });
}

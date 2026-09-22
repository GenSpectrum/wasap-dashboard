/**
 * `useLocationOverview` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { locationSampleOverviewQuery, readLocationOverview, type LocationOverview } from '../queries';

/** Every location the instance holds, with its sample count and most recent sample date. */
export function useLocationOverview(): UseQueryResult<LocationOverview[]> {
    const connection = useConnection();
    const schema = useSiloSchema();
    // `schema` stands in for `connection.key` (same memoized SiloInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'location-overview', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(locationSampleOverviewQuery(schema), 'Location overview', {
                signal,
            });
            return readLocationOverview(rows, schema);
        },
    });
}

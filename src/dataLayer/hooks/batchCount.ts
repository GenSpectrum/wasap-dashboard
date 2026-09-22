/**
 * `useBatchCount` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { batchCountQuery } from '../queries';

/** The number of distinct batches the instance holds. */
export function useBatchCount(): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useSiloSchema();
    // `schema` stands in for `connection.key` (same memoized SiloInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'batch-count', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(batchCountQuery(schema), 'Batch count', { signal });
            return rows.length;
        },
    });
}

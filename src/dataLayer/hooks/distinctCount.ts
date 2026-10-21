/**
 * `useDistinctCount` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { distinctCountQuery, readTotalCount } from '../queries';

/** The number of distinct values of `column` the instance holds, e.g. batches or samples. */
export function useDistinctCount(column: string): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useSiloSchema();
    // `schema` stands in for `connection.key` (same memoized SiloInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'distinct-count', ...connection.key, column],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(distinctCountQuery(schema, column), `Distinct ${column} count`, {
                signal,
            });
            return readTotalCount(rows);
        },
    });
}

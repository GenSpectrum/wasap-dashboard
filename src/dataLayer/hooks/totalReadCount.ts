/**
 * `useTotalReadCount` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { normalizeFilter, readTotalCount, totalReadCountQuery, type SiloReadFilter } from '../queries';

/** Total reads the filter admits. Also the "is the instance answering" probe. */
export function useTotalReadCount(filter: SiloReadFilter = {}): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);
    // `schema` stands in for `connection.key` (same memoized SiloInstance);
    // `normalized` stands in for `filter` — a pure derivation of it,
    // deliberately used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'total-read-count', ...connection.key, normalized],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(totalReadCountQuery(schema, normalized), 'Total read count', {
                signal,
            });
            return readTotalCount(rows);
        },
    });
}

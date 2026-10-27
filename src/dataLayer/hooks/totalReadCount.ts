/**
 * `useTotalReadCount` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useRhydbSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useRhydbSchema } from './connection';
import { useRhydbQuery } from './rhydbQuery';
import { normalizeFilter, readTotalCount, totalReadCountQuery, type RhydbReadFilter } from '../queries';

/** Total reads the filter admits. Also the "is the instance answering" probe. */
export function useTotalReadCount(filter: RhydbReadFilter = {}): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    const normalized = normalizeFilter(filter);
    // `schema` stands in for `connection.key` (same memoized RhydbInstance);
    // `normalized` stands in for `filter` — a pure derivation of it,
    // deliberately used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'total-read-count', ...connection.key, normalized],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(totalReadCountQuery(schema, normalized), 'Total read count', {
                signal,
            });
            return readTotalCount(rows);
        },
    });
}

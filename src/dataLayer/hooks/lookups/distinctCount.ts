/**
 * `useDistinctCount` — a Tier-1 RhyDB read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useRhydbSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { type UseQueryResult } from '@tanstack/react-query';

import { distinctCountQuery, readTotalCount } from '../../queries';
import { useConnection, useRhydbSchema } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/** The number of distinct values of `column` the instance holds, e.g. batches or samples. */
export function useDistinctCount(column: string): UseQueryResult<number> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'distinct-count', ...connection.key, column],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(distinctCountQuery(schema, column), `Distinct ${column} count`, {
                signal,
            });
            return readTotalCount(rows);
        },
    });
}

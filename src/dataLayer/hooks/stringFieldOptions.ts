/**
 * `useStringFieldOptions` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { readNamedCounts, stringFieldValuesQuery, type NamedCount } from '../queries';

/**
 * Every distinct value of a string column, with its read count, ordered by
 * name. Unfiltered and cheap (grouping a dictionary/indexed column) — a filter
 * dropdown offers every value the instance holds.
 */
export function useStringFieldOptions(field: string): UseQueryResult<NamedCount[]> {
    const connection = useConnection();
    const schema = useSiloSchema();
    // `schema` stands in for `connection.key` (same memoized SiloInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'string-field-options', ...connection.key, field],
        queryFn: async ({ signal }): Promise<NamedCount[]> => {
            const { rows } = await connection.query(stringFieldValuesQuery(schema, field), `Options for ${field}`, {
                signal,
            });
            return readNamedCounts(rows, field).sort((a, b) => a.name.localeCompare(b.name));
        },
    });
}

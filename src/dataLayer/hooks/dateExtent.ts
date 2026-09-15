/**
 * `useDateExtent` — a Tier-1 SILO read, as a TanStack Query hook.
 *
 * Reads the instance from context (`useConnection` / `useSiloSchema`), issues
 * one catalogue query, and hands back the parsed rows. Tier-1 reads are the
 * only layer that issues a query — components call these, never
 * `connection.query` directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { normalizeFilter, readValueExtent, samplingDatesQuery, type SiloReadFilter } from '../queries';

/**
 * The oldest and newest sampling date the filter admits, or `null` where
 * the filter admits nothing. Pass `enabled: false` to skip the query, e.g.
 * when the caller doesn't need the extent for the render at hand.
 */
export function useDateExtent(
    filter: SiloReadFilter = {},
    { enabled = true }: { enabled?: boolean } = {},
): UseQueryResult<{ min: string; max: string } | null> {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);
    // `schema` stands in for `connection.key` (same memoized SiloInstance);
    // `normalized` stands in for `filter` — a pure derivation of it,
    // deliberately used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['silo', 'date-extent', ...connection.key, normalized],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(samplingDatesQuery(schema, normalized), 'Sampling dates', {
                signal,
            });
            // queryFn must not resolve `undefined` (TanStack Query treats that as
            // "no data" internally) — `null` is the "no extent" value instead.
            return readValueExtent(rows, schema.groupingDate) ?? null;
        },
        enabled,
    });
}

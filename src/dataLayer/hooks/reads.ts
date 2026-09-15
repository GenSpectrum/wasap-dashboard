/**
 * The Tier-1 SILO reads, as TanStack Query hooks.
 *
 * Each reads the instance from context (`useConnection` / `useSiloSchema`),
 * issues one catalogue query, and hands back the parsed rows. This is the only
 * layer that issues a query — components call these, never `connection.query`
 * directly (doc 04, "One mechanism").
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import {
    normalizeFilter,
    readNamedCounts,
    readTotalCount,
    readValueExtent,
    samplingDatesQuery,
    stringFieldValuesQuery,
    totalReadCountQuery,
    type NamedCount,
    type SiloReadFilter,
} from '../queries';

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

/**
 * The oldest and newest sampling date the filter admits, or `undefined` where
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

/**
 * The instance's data version — the Unix timestamp of its current snapshot,
 * carried on every response. `null` where the instance did not send one.
 *
 * A one-row query is the cheapest way to read the header.
 */
export function useDataVersion(): UseQueryResult<string | null> {
    const connection = useConnection();
    return useQuery({
        queryKey: ['silo', 'data-version', ...connection.key],
        queryFn: async ({ signal }) => {
            const { dataVersion } = await connection.query(connection.root().limit(1), 'Data version', {
                signal,
            });
            return dataVersion;
        },
        staleTime: 5 * 60 * 1000,
    });
}

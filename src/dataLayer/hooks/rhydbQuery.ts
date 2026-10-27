/**
 * TanStack queries of SILO reads, on a query client of their own, which the `ConnectionProvider` holds:
 * every hook in `dataLayer/hooks` that reads from SILO uses `useRhydbQuery` / `useRhydbQueries` instead of
 * `useQuery` / `useQueries` (ESLint enforces it).
 */

import {
    useQueries,
    useQuery,
    type QueriesResults,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
} from '@tanstack/react-query';

import { useRhydbQueryClient } from './connection';

/** `useQuery` on the SILO query client. */
export function useRhydbQuery<
    TQueryFnData,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
    return useQuery(options, useRhydbQueryClient());
}

/** `useQueries` on the SILO query client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the same constraint as `useQueries`
export function useRhydbQueries<T extends any[], TCombinedResult = QueriesResults<T>>(
    options: Parameters<typeof useQueries<T, TCombinedResult>>[0],
): TCombinedResult {
    return useQueries<T, TCombinedResult>(options, useRhydbQueryClient());
}

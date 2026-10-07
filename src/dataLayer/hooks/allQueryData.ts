import { type UseQueryResult } from '@tanstack/react-query';

/**
 * A `combine` for `useQueries` that waits for all the queries: their data in order once every one has
 * answered (`undefined` until then), and the first error.
 *
 * TanStack runs `combine` again whenever one of the results changes, and keeps its output otherwise, so
 * the data can be memoized on. `useQueries`' own result is a new array on every render, and what it
 * holds can change without its length or which queries have answered changing: when a filter change
 * swaps in other, already cached, results.
 */
export function allQueryData<T>(results: UseQueryResult<T>[]): { data: T[] | undefined; error: Error | undefined } {
    const error = results.find((result) => result.error !== null)?.error ?? undefined;
    const data: T[] = [];
    for (const result of results) {
        if (result.data === undefined) {
            return { data: undefined, error };
        }
        data.push(result.data);
    }
    return { data, error };
}

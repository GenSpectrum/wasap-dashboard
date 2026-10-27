import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionProvider } from '../connection';
import { useDistinctCount } from './distinctCount';
import type { RhydbSchema } from '../../queries/schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

/** An NDJSON `Response`, as RhyDB's `/query` returns. */
function ndjson(rows: unknown[]): Response {
    return new Response(rows.map((row) => JSON.stringify(row)).join('\n'), {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson', 'data-version': '1750000000' },
    });
}

function wrapper(): FC<PropsWithChildren> {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://rhydb.example.org/covid' schema={schema}>
                {children}
            </ConnectionProvider>
        </QueryClientProvider>
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('useDistinctCount', () => {
    it('reads the count of groups the server returns, unfiltered', async () => {
        const fetchMock = vi.fn().mockResolvedValue(ndjson([{ n: 3 }]));
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useDistinctCount('batchId'), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(3);

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe(
            'data.group(by := {batchId}, aggs := {n := count()}).group(by := {}, aggs := {n := count()})',
        );
    });

    it('caches each column separately', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(ndjson([{ n: 3 }]))
            .mockResolvedValueOnce(ndjson([{ n: 7 }]));
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => [useDistinctCount('batchId'), useDistinctCount('sampleId')], {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));
        expect(result.current.map((query) => query.data).sort()).toEqual([3, 7]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

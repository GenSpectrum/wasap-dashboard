import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBatchCount } from './batchCount';
import { ConnectionProvider } from './connection';
import type { SiloSchema } from '../queries/schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

/** An NDJSON `Response`, as SILO's `/query` returns. */
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
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                {children}
            </ConnectionProvider>
        </QueryClientProvider>
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('useBatchCount', () => {
    it('counts the rows, one per distinct batch, unfiltered', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { batchId: 'B1', n: 100 },
                { batchId: 'B2', n: 50 },
                { batchId: 'B3', n: 75 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useBatchCount(), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(3);

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe('default.groupBy({n := count()}, {batchId})');
    });

    it('no batches means zero', async () => {
        const fetchMock = vi.fn().mockResolvedValue(ndjson([]));
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useBatchCount(), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(0);
    });
});
